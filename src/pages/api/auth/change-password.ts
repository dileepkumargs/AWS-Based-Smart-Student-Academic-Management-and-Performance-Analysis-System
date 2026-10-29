import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { getPool } from "@/lib/database";
import {
    hashPassword,
    requireUser,
    replaceUserSessions,
    setSessionCookie,
    verifyPassword,
    writeAuditLog
} from "@/lib/auth";

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(12).max(256)
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).end();
    }

    const user = await requireUser(req, res, undefined, true);
    if (!user) return;
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "New password must contain at least 12 characters." });
    }

    const { rows } = await getPool().query("SELECT password_hash FROM users WHERE id = $1", [user.id]);
    if (!rows[0] || !(await verifyPassword(parsed.data.currentPassword, rows[0].password_hash))) {
        return res.status(400).json({ message: "Current password is incorrect." });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    const token = await replaceUserSessions(user.id, passwordHash);
    setSessionCookie(res, token);
    await writeAuditLog(user.id, "auth.password_changed", "user", user.id);
    return res.status(200).json({ ok: true });
}
