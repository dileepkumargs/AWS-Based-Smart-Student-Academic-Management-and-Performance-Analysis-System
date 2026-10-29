import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { courseSchema, facultyCourseUpdateSchema } from "@/lib/validators";
import { canAccessCourse } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.query.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid course ID." });

    if (req.method === "GET") {
        if (!(await canAccessCourse(user, id))) {
            return res.status(user.role === "STUDENT" ? 404 : 403).json({ message: "Course not found." });
        }
        const { rows } = await getPool().query(
            `SELECT c.id, c.code, c.name, c.credits, c.department,
                    COALESCE(f.name, c.instructor) AS instructor
             FROM courses c LEFT JOIN faculty f ON f.id = c.faculty_id WHERE c.id = $1`,
            [id]
        );
        if (!rows[0]) return res.status(404).json({ message: "Course not found." });
        return res.status(200).json({ ...rows[0], id: Number(rows[0].id), credits: Number(rows[0].credits) });
    }

    if (req.method === "PUT") {
        if (user.role === "FACULTY") {
            if (!(await canAccessCourse(user, id))) {
                return res.status(403).json({ message: "You can only update courses assigned to you." });
            }
            const parsed = facultyCourseUpdateSchema.partial().strict().safeParse(req.body);
            if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
                return res.status(400).json({ message: "Provide a valid course name or department." });
            }
            const current = await getPool().query(
                "SELECT name, department FROM courses WHERE id = $1",
                [id]
            );
            if (!current.rows[0]) return res.status(404).json({ message: "Course not found." });
            const updated = await getPool().query(
                "UPDATE courses SET name = $1, department = $2 WHERE id = $3 AND faculty_id = $4",
                [
                    parsed.data.name ?? current.rows[0].name,
                    parsed.data.department ?? current.rows[0].department,
                    id,
                    user.facultyId
                ]
            );
            if (updated.rowCount === 0 && !(await canAccessCourse(user, id))) {
                return res.status(403).json({ message: "You can only update courses assigned to you." });
            }
            await writeAuditLog(user.id, "course.updated", "course", id, {
                fields: Object.keys(parsed.data),
                actorRole: user.role
            });
            const { rows } = await getPool().query(
                `SELECT c.id, c.code, c.name, c.credits, c.department,
                        COALESCE(f.name, c.instructor) AS instructor, c.faculty_id AS facultyId
                 FROM courses c LEFT JOIN faculty f ON f.id = c.faculty_id WHERE c.id = $1`,
                [id]
            );
            return res.status(200).json({
                ...rows[0],
                id: Number(rows[0].id),
                credits: Number(rows[0].credits),
                facultyId: rows[0].facultyId === null ? null : Number(rows[0].facultyId)
            });
        }

        if (user.role !== "SUPER_ADMIN") {
            return res.status(403).json({ message: "You cannot modify course records." });
        }
        const parsed = courseSchema.partial().strict().safeParse(req.body);
        if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
            return res.status(400).json({ message: "Provide at least one valid course field." });
        }
        const current = await getPool().query(
            "SELECT id, code, name, credits, department, instructor FROM courses WHERE id = $1",
            [id]
        );
        if (!current.rows[0]) return res.status(404).json({ message: "Course not found." });
        const updated = { ...current.rows[0], ...parsed.data };
        const facultyResult = updated.instructor
            ? await getPool().query("SELECT id FROM faculty WHERE name = $1 ORDER BY id LIMIT 1", [updated.instructor])
            : { rows: [] };
        await getPool().query(
            `UPDATE courses SET code = $1, name = $2, credits = $3, department = $4,
                    instructor = $5, faculty_id = $6
             WHERE id = $7`,
            [updated.code, updated.name, updated.credits, updated.department, updated.instructor ?? null,
                facultyResult.rows[0]?.id ?? null, id]
        );
        await writeAuditLog(user.id, "course.updated", "course", id, {
            fields: Object.keys(parsed.data),
            actorRole: user.role
        });
        const { rows } = await getPool().query(
            `SELECT c.id, c.code, c.name, c.credits, c.department,
                    COALESCE(f.name, c.instructor) AS instructor, c.faculty_id AS facultyId
             FROM courses c LEFT JOIN faculty f ON f.id = c.faculty_id WHERE c.id = $1`,
            [id]
        );
        const row = rows[0];
        return res.status(200).json({
            ...row,
            id: Number(row.id),
            credits: Number(row.credits),
            facultyId: row.facultyId === null ? null : Number(row.facultyId)
        });
    }

    if (req.method === "DELETE") {
        if (user.role !== "SUPER_ADMIN") {
            return res.status(403).json({ message: "Only a Super Admin can delete courses." });
        }
        const { rows } = await getPool().query(
            `SELECT EXISTS (SELECT 1 FROM courses WHERE id = $1) AS record_exists,
                    EXISTS (SELECT 1 FROM enrollments WHERE course_id = $1) AS has_enrollments`,
            [id]
        );
        if (!Boolean(rows[0]?.record_exists)) return res.status(404).json({ message: "Course not found." });
        if (Boolean(rows[0].has_enrollments)) {
            return res.status(409).json({ message: "This course has enrollment history and cannot be deleted." });
        }
        await getPool().query("DELETE FROM courses WHERE id = $1", [id]);
        await writeAuditLog(user.id, "course.deleted", "course", id);
        return res.status(204).end();
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).end();
}
