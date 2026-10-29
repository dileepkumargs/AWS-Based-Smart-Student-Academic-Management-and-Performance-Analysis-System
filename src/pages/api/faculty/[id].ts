import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { facultySchema } from "@/lib/validators";
import { requireUser, writeAuditLog } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.query.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid faculty ID." });

    if (req.method === "GET") {
        const { rows } = await getPool().query(
            `SELECT id, name, email, department, specialization, phone FROM faculty
             WHERE id = $1 AND ($2 = 'SUPER_ADMIN' OR (user_id = $3 AND $2 = 'FACULTY'))`,
            [id, user.role, user.id]
        );
        if (!rows[0]) return res.status(404).json({ message: "Faculty member not found." });
        return res.status(200).json({ ...rows[0], id: Number(rows[0].id) });
    }

    if (user.role !== "SUPER_ADMIN") return res.status(403).json({ message: "Only a Super Admin can modify faculty records." });

    if (req.method === "PUT") {
        const parsed = facultySchema.partial().safeParse(req.body);
        if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
            return res.status(400).json({ message: "Provide at least one valid faculty field." });
        }
        const current = await getPool().query(
            "SELECT id, name, email, department, specialization, phone FROM faculty WHERE id = $1",
            [id]
        );
        if (!current.rows[0]) return res.status(404).json({ message: "Faculty member not found." });
        const updated = { ...current.rows[0], ...parsed.data };
        await getPool().query(
            `UPDATE faculty SET name = $1, email = LOWER($2), department = $3,
                    specialization = $4, phone = $5
             WHERE id = $6`,
            [updated.name, updated.email, updated.department, updated.specialization, updated.phone ?? null, id]
        );
        await writeAuditLog(user.id, "faculty.updated", "faculty", id, { fields: Object.keys(parsed.data) });
        const { rows } = await getPool().query(
            "SELECT id, name, email, department, specialization, phone FROM faculty WHERE id = $1",
            [id]
        );
        return res.status(200).json({ ...rows[0], id: Number(rows[0].id) });
    }

    if (req.method === "DELETE") {
        const { rows } = await getPool().query(
            `SELECT EXISTS (SELECT 1 FROM faculty WHERE id = $1) AS record_exists,
                    EXISTS (SELECT 1 FROM courses WHERE faculty_id = $1) AS has_courses,
                    EXISTS (SELECT 1 FROM faculty WHERE id = $1 AND user_id IS NOT NULL) AS has_account`,
            [id]
        );
        if (!Boolean(rows[0]?.record_exists)) return res.status(404).json({ message: "Faculty member not found." });
        if (Boolean(rows[0].has_courses) || Boolean(rows[0].has_account)) {
            return res.status(409).json({ message: "This faculty member has assigned courses or an account and cannot be deleted." });
        }
        await getPool().query("DELETE FROM faculty WHERE id = $1", [id]);
        await writeAuditLog(user.id, "faculty.deleted", "faculty", id);
        return res.status(204).end();
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).end();
}
