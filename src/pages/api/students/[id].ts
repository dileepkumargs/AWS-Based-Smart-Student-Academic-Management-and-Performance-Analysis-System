import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { studentSchema } from "@/lib/validators";
import { canAccessStudent } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.query.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid student ID." });

    if (req.method === "GET") {
        if (!(await canAccessStudent(user, id))) {
            return res.status(user.role === "STUDENT" ? 404 : 403).json({ message: "Student not found." });
        }
        const { rows } = await getPool().query(
            "SELECT id, name, year, course, gpa FROM students WHERE id = $1",
            [id]
        );
        if (!rows[0]) return res.status(404).json({ message: "Student not found." });
        return res.status(200).json({ ...rows[0], id: Number(rows[0].id), year: Number(rows[0].year), gpa: Number(rows[0].gpa) });
    }

    if (user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only a Super Admin can modify student records." });
    }

    if (req.method === "PUT") {
        const parsed = studentSchema.partial().safeParse(req.body);
        if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
            return res.status(400).json({ message: "Provide at least one valid student field." });
        }
        const existing = await getPool().query("SELECT id, name, year, course, gpa FROM students WHERE id = $1", [id]);
        if (!existing.rows[0]) return res.status(404).json({ message: "Student not found." });
        const updated = { ...existing.rows[0], ...parsed.data };
        await getPool().query(
            `UPDATE students SET name = $1, year = $2, course = $3, gpa = $4
             WHERE id = $5`,
            [updated.name, updated.year, updated.course, updated.gpa, id]
        );
        await writeAuditLog(user.id, "student.updated", "student", id, { fields: Object.keys(parsed.data) });
        const { rows } = await getPool().query("SELECT id, name, year, course, gpa FROM students WHERE id = $1", [id]);
        const row = rows[0];
        return res.status(200).json({ ...row, id: Number(row.id), year: Number(row.year), gpa: Number(row.gpa) });
    }

    if (req.method === "DELETE") {
        const { rows } = await getPool().query(
            `SELECT
                EXISTS (SELECT 1 FROM enrollments WHERE student_id = $1) AS has_enrollments,
                EXISTS (SELECT 1 FROM students WHERE id = $1 AND user_id IS NOT NULL) AS has_user`,
            [id]
        );
        if (!rows[0]) return res.status(404).json({ message: "Student not found." });
        if (Boolean(rows[0].has_enrollments) || Boolean(rows[0].has_user)) {
            return res.status(409).json({ message: "This student has linked academic records or an account. Deactivate the account or resolve linked records first." });
        }
        const result = await getPool().query("DELETE FROM students WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Student not found." });
        await writeAuditLog(user.id, "student.deleted", "student", id);
        return res.status(204).end();
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).end();
}
