import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";

const scrypt = promisify(scryptCallback);
const SESSION_TTL_SECONDS = 60 * 60 * 8;
type SessionRequest = Pick<NextApiRequest, "headers">;

export type Role = "SUPER_ADMIN" | "FACULTY" | "STUDENT";

export interface AuthUser {
    id: number;
    email: string;
    displayName: string;
    role: Role;
    mustChangePassword: boolean;
    studentId: number | null;
    facultyId: number | null;
}

function sessionCookieName() {
    return process.env.NODE_ENV === "production" ? "__Host-ams_session" : "ams_session";
}

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function hashLoginAttempt(ip: string, email: string) {
    return createHash("sha256").update(`${ip}:${email.trim().toLowerCase()}`).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const derivedKey = await scrypt(password, salt, 64) as Buffer;
    return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    const [algorithm, saltHex, keyHex] = storedHash.split("$");
    if (algorithm !== "scrypt" || !saltHex || !keyHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]{128}$/i.test(keyHex)) {
        return false;
    }

    const expected = Buffer.from(keyHex, "hex");
    const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length) as Buffer;
    return timingSafeEqual(expected, actual);
}

function readSessionToken(req: SessionRequest) {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;

    const cookieName = sessionCookieName();
    const sessionCookie = cookieHeader.split(";").map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
    if (!sessionCookie) return null;
    try {
        return decodeURIComponent(sessionCookie.slice(cookieName.length + 1));
    } catch {
        return null;
    }
}

export function setSessionCookie(res: NextApiResponse, token: string) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${sessionCookieName()}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`);
}

export function clearSessionCookie(res: NextApiResponse) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${sessionCookieName()}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

export async function createSession(userId: number) {
    const token = randomBytes(32).toString("base64url");
    await getPool().query(
        `INSERT INTO user_sessions (token_hash, user_id, expires_at)
         VALUES ($1, $2, DATE_ADD(NOW(), INTERVAL $3 SECOND))`,
        [hashToken(token), userId, SESSION_TTL_SECONDS]
    );
    return token;
}

export async function replaceUserSessions(userId: number, passwordHash?: string) {
    const token = randomBytes(32).toString("base64url");
    const client = await getPool().connect();
    try {
        await client.beginTransaction();
        if (passwordHash) {
            await client.query(
                "UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2",
                [passwordHash, userId]
            );
        }
        await client.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
        await client.query(
            `INSERT INTO user_sessions (token_hash, user_id, expires_at)
             VALUES ($1, $2, DATE_ADD(NOW(), INTERVAL $3 SECOND))`,
            [hashToken(token), userId, SESSION_TTL_SECONDS]
        );
        await client.commit();
    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        client.release();
    }
    return token;
}

export async function getAuthenticatedUser(req: SessionRequest): Promise<AuthUser | null> {
    const token = readSessionToken(req);
    if (!token) return null;

    const { rows } = await getPool().query(
        `SELECT u.id, u.email, u.display_name, u.role, u.is_active, u.must_change_password,
                s.id AS student_id, f.id AS faculty_id
         FROM user_sessions session
         JOIN users u ON u.id = session.user_id
         LEFT JOIN students s ON s.user_id = u.id
         LEFT JOIN faculty f ON f.user_id = u.id
         WHERE session.token_hash = $1 AND session.expires_at > NOW()`,
        [hashToken(token)]
    );
    const row = rows[0];
    if (!row || !row.is_active) return null;

    return {
        id: Number(row.id),
        email: row.email,
        displayName: row.display_name,
        role: row.role,
        mustChangePassword: Boolean(row.must_change_password),
        studentId: row.student_id === null ? null : Number(row.student_id),
        facultyId: row.faculty_id === null ? null : Number(row.faculty_id)
    };
}

export async function revokeSession(req: NextApiRequest) {
    const token = readSessionToken(req);
    if (token) {
        await getPool().query("DELETE FROM user_sessions WHERE token_hash = $1", [hashToken(token)]);
    }
}

export async function authenticateCredentials(
    email: string,
    password: string,
    role: Role,
    ipAddress: string
): Promise<{ userId: number; mustChangePassword: boolean } | null> {
    const pool = getPool();
    const attemptKey = hashLoginAttempt(ipAddress, email);
    const { rows: attempts } = await pool.query(
        `SELECT blocked_until FROM auth_login_attempts
         WHERE attempt_key = $1 AND blocked_until > NOW()`,
        [attemptKey]
    );
    if (attempts.length > 0) return null;

    const { rows } = await pool.query(
        `SELECT id, password_hash, must_change_password FROM users
         WHERE LOWER(email) = LOWER($1) AND role = $2 AND is_active = TRUE`,
        [email.trim(), role]
    );
    const user = rows[0];
    const valid = user ? await verifyPassword(password, user.password_hash) : false;

    if (!valid) {
        await pool.query(
            `INSERT INTO auth_login_attempts (attempt_key, attempt_count, window_started_at, blocked_until)
             VALUES ($1, 1, NOW(), NULL)
             ON DUPLICATE KEY UPDATE
               blocked_until = CASE
                 WHEN window_started_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE) THEN NULL
                 WHEN attempt_count + 1 >= 5 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
                 ELSE blocked_until
               END,
               attempt_count = IF(window_started_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE), 1, attempt_count + 1),
               window_started_at = IF(window_started_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE), NOW(), window_started_at)`,
            [attemptKey]
        );
        return null;
    }

    await pool.query("DELETE FROM auth_login_attempts WHERE attempt_key = $1", [attemptKey]);
    return { userId: Number(user.id), mustChangePassword: Boolean(user.must_change_password) };
}

export async function requireUser(
    req: NextApiRequest,
    res: NextApiResponse,
    roles?: Role[],
    allowPasswordChange = false
): Promise<AuthUser | null> {
    const user = await getAuthenticatedUser(req);
    if (!user) {
        res.status(401).json({ message: "Authentication required." });
        return null;
    }
    if (roles && !roles.includes(user.role)) {
        res.status(403).json({ message: "You do not have permission to perform this action." });
        return null;
    }
    if (user.mustChangePassword && !allowPasswordChange) {
        res.status(403).json({ message: "Change your initial password before continuing.", code: "PASSWORD_CHANGE_REQUIRED" });
        return null;
    }
    return user;
}

export async function writeAuditLog(
    actorUserId: number,
    action: string,
    resourceType: string,
    resourceId: number | string | null,
    details: Record<string, unknown> = {}
) {
    await getPool().query(
        `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [actorUserId, action, resourceType, resourceId === null ? null : String(resourceId), JSON.stringify(details)]
    );
}

export const isAdmin = (user: AuthUser) => user.role === "SUPER_ADMIN";
