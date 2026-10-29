import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { hashPassword, requireUser } from "@/lib/auth";
import { getPool } from "@/lib/database";
import { getPagination, getQueryString } from "@/lib/academic-access";

const createUserSchema = z.discriminatedUnion("role", [
    z.object({
        role: z.literal("STUDENT"),
        email: z.string().email().max(254),
        password: z.string().min(12).max(256),
        name: z.string().min(2).max(120),
        year: z.number().int().min(1900).max(2200).optional(),
        course: z.string().min(2).max(120).optional(),
        gpa: z.number().min(0).max(4).optional(),
        studentId: z.number().int().positive().optional()
    }),
    z.object({
        role: z.literal("FACULTY"),
        email: z.string().email().max(254),
        password: z.string().min(12).max(256),
        name: z.string().min(2).max(120),
        department: z.string().min(2).max(120),
        specialization: z.string().min(2).max(160),
        phone: z.string().max(40).optional(),
        facultyId: z.number().int().positive().optional()
    })
]).superRefine((data, context) => {
    if (data.role === "STUDENT" && !data.studentId) {
        if (data.year === undefined) context.addIssue({ code: "custom", path: ["year"], message: "Academic year is required for a new student profile." });
        if (!data.course) context.addIssue({ code: "custom", path: ["course"], message: "Program is required for a new student profile." });
        if (data.gpa === undefined) context.addIssue({ code: "custom", path: ["gpa"], message: "GPA is required for a new student profile." });
    }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const actor = await requireUser(req, res, ["SUPER_ADMIN"]);
    if (!actor) return;

    if (req.method === "GET") {
        const { page, limit, offset } = getPagination(req, 20);
        const search = getQueryString(req, "search");
        const { rows } = await getPool().query(
            `SELECT u.id, u.email, u.display_name AS displayName, u.role,
                    u.is_active AS isActive, u.must_change_password AS mustChangePassword,
                    s.id AS studentId, f.id AS facultyId
             FROM users u
             LEFT JOIN students s ON s.user_id = u.id
             LEFT JOIN faculty f ON f.user_id = u.id
             WHERE ($1 = '' OR LOWER(u.email) LIKE CONCAT('%', LOWER($1), '%')
                    OR LOWER(u.display_name) LIKE CONCAT('%', LOWER($1), '%'))
             ORDER BY u.id DESC
             LIMIT $2 OFFSET $3`,
            [search, limit, offset]
        );
        const count = await getPool().query(
            `SELECT COUNT(*) AS total FROM users
             WHERE ($1 = '' OR LOWER(email) LIKE CONCAT('%', LOWER($1), '%')
                    OR LOWER(display_name) LIKE CONCAT('%', LOWER($1), '%'))`,
            [search]
        );
        const data = rows.map(row => ({
            id: Number(row.id),
            email: row.email,
            displayName: row.displayName,
            role: row.role,
            isActive: Boolean(row.isActive),
            mustChangePassword: Boolean(row.mustChangePassword),
            studentId: row.studentId === null ? null : Number(row.studentId),
            facultyId: row.facultyId === null ? null : Number(row.facultyId)
        }));
        return res.status(200).json({ data, meta: { total: Number(count.rows[0].total), page, limit } });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
    }

    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid account details.", errors: parsed.error.flatten().fieldErrors });
    }

    const client = await getPool().connect();
    try {
        await client.beginTransaction();
        const passwordHash = await hashPassword(parsed.data.password);
        const userInsert = await client.query(
            `INSERT INTO users (email, password_hash, role, display_name, must_change_password, created_by)
             VALUES (LOWER($1), $2, $3, $4, TRUE, $5)`,
            [parsed.data.email, passwordHash, parsed.data.role, parsed.data.name, actor.id]
        );
        const userId = userInsert.insertId;
        const userResult = await client.query("SELECT id, email, role FROM users WHERE id = $1", [userId]);
        const user = userResult.rows[0];
        let profileId: number;

        if (parsed.data.role === "STUDENT") {
            if (parsed.data.studentId) {
                const profile = await client.query(
                    `UPDATE students SET user_id = $1 WHERE id = $2 AND user_id IS NULL`,
                    [user.id, parsed.data.studentId]
                );
                if (profile.rowCount === 0) throw new Error("STUDENT_PROFILE_UNAVAILABLE");
                profileId = parsed.data.studentId;
            } else {
                const profile = await client.query(
                    `INSERT INTO students (user_id, name, year, course, gpa)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [user.id, parsed.data.name, parsed.data.year!, parsed.data.course!, parsed.data.gpa!]
                );
                profileId = profile.insertId;
            }
        } else if (parsed.data.facultyId) {
            const profile = await client.query(
                `UPDATE faculty SET user_id = $1
                 WHERE id = $2 AND user_id IS NULL AND LOWER(email) = LOWER($3)`,
                [user.id, parsed.data.facultyId, parsed.data.email]
            );
            if (profile.rowCount === 0) throw new Error("FACULTY_PROFILE_UNAVAILABLE");
            profileId = parsed.data.facultyId;
        } else {
            const existing = await client.query(
                `SELECT id FROM faculty
                 WHERE LOWER(email) = LOWER($1) AND user_id IS NULL
                 ORDER BY id LIMIT 1`,
                [parsed.data.email]
            );
            if (existing.rows[0]) {
                profileId = Number(existing.rows[0].id);
                await client.query(
                    "UPDATE faculty SET user_id = $1 WHERE id = $2 AND user_id IS NULL",
                    [user.id, profileId]
                );
            } else {
                const profile = await client.query(
                    `INSERT INTO faculty (user_id, name, email, department, specialization, phone)
                     VALUES ($1, $2, LOWER($3), $4, $5, $6)`,
                    [user.id, parsed.data.name, parsed.data.email, parsed.data.department,
                        parsed.data.specialization, parsed.data.phone ?? null]
                );
                profileId = profile.insertId;
            }
        }

        await client.query(
            `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, details)
             VALUES ($1, 'user.created', 'user', $2, $3)`,
            [actor.id, String(user.id), JSON.stringify({ role: user.role, profileId })]
        );
        await client.commit();
        return res.status(201).json({ id: Number(user.id), email: user.email, role: user.role, profileId });
    } catch (error) {
        await client.rollback();
        if (error instanceof Error && error.message.endsWith("_PROFILE_UNAVAILABLE")) {
            return res.status(409).json({ message: "That academic profile is already linked to an account or does not exist." });
        }
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "An account with that email already exists." });
        }
        throw error;
    } finally {
        client.release();
    }
}
