import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { enrollmentSchema } from "@/lib/validators";
import { canAccessEnrollment } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.query.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid enrollment ID." });

    if (req.method === "GET") {
        if (!(await canAccessEnrollment(user, id))) {
            return res.status(user.role === "STUDENT" ? 404 : 403).json({ message: "Enrollment not found." });
        }
        const { rows } = await getPool().query(
            `SELECT e.id, e.student_id AS studentId, e.course_id AS courseId, e.grade,
                    e.semester, e.year, e.status, DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') AS enrolledDate,
                    s.name AS studentName, c.name AS courseName, c.code AS courseCode
             FROM enrollments e
             JOIN students s ON s.id = e.student_id
             JOIN courses c ON c.id = e.course_id
             WHERE e.id = $1`,
            [id]
        );
        if (!rows[0]) return res.status(404).json({ message: "Enrollment not found." });
        const row = rows[0];
        return res.status(200).json({
            ...row,
            id: Number(row.id),
            studentId: Number(row.studentId),
            courseId: Number(row.courseId),
            year: Number(row.year)
        });
    }

    if (req.method === "PUT") {
        if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot modify enrollment records." });
        if (!(await canAccessEnrollment(user, id))) {
            return res.status(user.role === "FACULTY" ? 403 : 404).json({ message: "Enrollment not found." });
        }
        const parsed = enrollmentSchema.partial().safeParse(req.body);
        if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
            return res.status(400).json({ message: "Provide at least one valid enrollment field." });
        }
        if (user.role === "FACULTY" && Object.keys(parsed.data).some(key => key !== "grade" && key !== "status")) {
            return res.status(403).json({ message: "Faculty may only update grades and completion status." });
        }
        const current = await getPool().query(
            `SELECT id, student_id AS studentId, course_id AS courseId, grade,
                    semester, year, status, DATE_FORMAT(enrolled_date, '%Y-%m-%d') AS enrolledDate
             FROM enrollments WHERE id = $1`,
            [id]
        );
        if (!current.rows[0]) return res.status(404).json({ message: "Enrollment not found." });
        const updated = { ...current.rows[0], ...parsed.data };
        if (user.role === "FACULTY" && (
            Number(updated.studentId) !== Number(current.rows[0].studentId) ||
            Number(updated.courseId) !== Number(current.rows[0].courseId)
        )) {
            return res.status(403).json({ message: "Faculty cannot move an enrollment between students or courses." });
        }
        await getPool().query(
            `UPDATE enrollments SET student_id = $1, course_id = $2, grade = $3,
                    semester = $4, year = $5, status = $6, enrolled_date = $7
             WHERE id = $8`,
            [updated.studentId, updated.courseId, updated.grade ?? null, updated.semester,
                updated.year, updated.status, updated.enrolledDate, id]
        );
        await writeAuditLog(user.id, "enrollment.updated", "enrollment", id, {
            fields: Object.keys(parsed.data),
            gradeChanged: parsed.data.grade !== undefined
        });
        const { rows } = await getPool().query(
            `SELECT id, student_id AS studentId, course_id AS courseId, grade,
                    semester, year, status, DATE_FORMAT(enrolled_date, '%Y-%m-%d') AS enrolledDate
             FROM enrollments WHERE id = $1`,
            [id]
        );
        const row = rows[0];
        return res.status(200).json({
            ...row,
            id: Number(row.id),
            studentId: Number(row.studentId),
            courseId: Number(row.courseId),
            year: Number(row.year)
        });
    }

    if (req.method === "DELETE") {
        if (user.role !== "SUPER_ADMIN") return res.status(403).json({ message: "Only a Super Admin can delete enrollment records." });
        const result = await getPool().query("DELETE FROM enrollments WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Enrollment not found." });
        await writeAuditLog(user.id, "enrollment.deleted", "enrollment", id);
        return res.status(204).end();
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).end();
}
