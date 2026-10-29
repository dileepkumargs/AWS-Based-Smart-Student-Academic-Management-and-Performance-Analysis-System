import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { z } from "zod";
import { hashPassword, requireUser } from "@/lib/auth";
import { getPool } from "@/lib/database";

const updateSchema = z.discriminatedUnion("action", [
    z.object({ action: z.enum(["activate", "deactivate"]) }),
    z.object({ action: z.literal("reset-password") })
]);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const actor = await requireUser(req, res, ["SUPER_ADMIN"]);
    if (!actor) return;
    if (req.method !== "PATCH") {
        res.setHeader("Allow", "PATCH");
        return res.status(405).end();
    }

    const id = Number(req.query.id);
    if (!Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({ message: "Invalid user ID." });
    }
    if (id === actor.id) {
        return res.status(400).json({ message: "You cannot deactivate or reset your own account here." });
    }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid user action." });

    const client = await getPool().connect();
    try {
        await client.beginTransaction();
        const target = await client.query("SELECT role FROM users WHERE id = $1 FOR UPDATE", [id]);
        if (!target.rows[0]) {
            await client.rollback();
            return res.status(404).json({ message: "User not found." });
        }

        if (parsed.data.action === "deactivate" && target.rows[0].role === "SUPER_ADMIN") {
            const admins = await client.query(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'SUPER_ADMIN' AND is_active = TRUE"
            );
            if (Number(admins.rows[0].count) <= 1) {
                await client.rollback();
                return res.status(409).json({ message: "The last active Super Admin cannot be deactivated." });
            }
        }

        let temporaryPassword: string | undefined;
        if (parsed.data.action === "reset-password") {
            temporaryPassword = randomBytes(18).toString("base64url");
            const passwordHash = await hashPassword(temporaryPassword);
            await client.query(
                `UPDATE users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW()
                 WHERE id = $2`,
                [passwordHash, id]
            );
            await client.query("DELETE FROM user_sessions WHERE user_id = $1", [id]);
        } else {
            const isActive = parsed.data.action === "activate";
            await client.query(
                `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2`,
                [isActive, id]
            );
            if (!isActive) await client.query("DELETE FROM user_sessions WHERE user_id = $1", [id]);
        }

        await client.query(
            `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, details)
             VALUES ($1, $2, 'user', $3, $4)`,
            [actor.id, `user.${parsed.data.action}`, String(id), JSON.stringify({ role: target.rows[0].role })]
        );
        await client.commit();
        return res.status(200).json({ ok: true, ...(temporaryPassword ? { temporaryPassword } : {}) });
    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        client.release();
    }
}
