import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { enrollmentSchema, facultyEnrollmentUpdateSchema } from "@/lib/validators";
import { canAccessEnrollment, canEditEnrollment } from "@/lib/academic-access";
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
            `SELECT e.id, e.student_id AS studentId, e.course_id AS courseId, e.branch,
                    e.study_year AS studyYear, e.grade, e.semester, e.year, e.status,
                    DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') AS enrolledDate,
                    s.name AS studentName, u.email AS studentEmail, c.name AS courseName, c.code AS courseCode,
                    c.department AS courseDepartment, c.branch AS courseBranch,
                    c.faculty_id AS courseFacultyId
             FROM enrollments e
             JOIN students s ON s.id = e.student_id
             LEFT JOIN courses c ON c.id = e.course_id
             LEFT JOIN users u ON u.id = s.user_id
             WHERE e.id = $1`,
            [id]
        );
        if (!rows[0]) return res.status(404).json({ message: "Enrollment not found." });
        const row = rows[0];
        return res.status(200).json({
            ...row,
            id: Number(row.id),
            studentId: Number(row.studentId),
            courseId: row.courseId === null ? null : Number(row.courseId),
            year: Number(row.year),
            studyYear: row.studyYear === null ? null : Number(row.studyYear),
            courseFacultyId: row.courseFacultyId === null ? null : Number(row.courseFacultyId)
        });
    }

    if (req.method === "PUT") {
        if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot modify enrollment records." });
        if (!(await canEditEnrollment(user, id))) {
            return res.status(user.role === "FACULTY" ? 403 : 404).json({ message: "Enrollment not found." });
        }
        const parsed = user.role === "FACULTY"
            ? facultyEnrollmentUpdateSchema.safeParse(req.body)
            : enrollmentSchema.partial().strict().safeParse(req.body);
        if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
            return res.status(400).json({ message: "Provide at least one valid enrollment field." });
        }
        const updateData: {
            studentId?: number;
            courseId?: number;
            branch?: string;
            studyYear?: number;
            grade?: string | null;
            semester?: string;
            year?: number;
            status?: "enrolled" | "completed" | "dropped";
            enrolledDate?: string;
        } = user.role === "FACULTY"
            ? parsed.data
            : parsed.data;
        if (user.role === "FACULTY" && Object.keys(updateData).some(key => key !== "grade" && key !== "status")) {
            return res.status(403).json({ message: "Faculty may only update grades and completion status." });
        }
        const current = await getPool().query(
            `SELECT id, student_id AS studentId, course_id AS courseId, branch,
                    study_year AS studyYear, grade, semester, year, status,
                    DATE_FORMAT(enrolled_date, '%Y-%m-%d') AS enrolledDate
             FROM enrollments WHERE id = $1`,
            [id]
        );
        if (!current.rows[0]) return res.status(404).json({ message: "Enrollment not found." });
        const updated = { ...current.rows[0], ...updateData };
        if (user.role === "FACULTY" && (
            Number(updated.studentId) !== Number(current.rows[0].studentId) ||
            Number(updated.courseId) !== Number(current.rows[0].courseId)
        )) {
            return res.status(403).json({ message: "Faculty cannot move an enrollment between students or courses." });
        }
        if (user.role === "FACULTY" && current.rows[0].status !== "enrolled" &&
            updateData.status !== undefined && updateData.status !== current.rows[0].status) {
            return res.status(409).json({ message: "Cancelled or completed enrollments cannot change status." });
        }
        const duplicateFieldsChanged = ["studentId", "semester", "year"]
            .some(field => field in updateData);
        if (duplicateFieldsChanged && updated.courseId === null) {
            const duplicate = await getPool().query(
                `SELECT id FROM enrollments
                 WHERE student_id = $1 AND semester = $2 AND year = $3 AND id <> $4`,
                [updated.studentId, updated.semester, updated.year, id]
            );
            if (duplicate.rows[0]) {
                return res.status(409).json({ message: "This student already has an enrollment for that academic period." });
            }
        }
        const branch = String(updated.branch);
        if (updateData.studentId !== undefined) {
            const student = await getPool().query(
                "SELECT id FROM students WHERE id = $1",
                [updated.studentId]
            );
            if (!student.rows[0]) return res.status(404).json({ message: "Student not found." });
        }
        await getPool().query(
            `UPDATE enrollments SET student_id = $1, course_id = $2, branch = $3, study_year = $4,
                    grade = $5, semester = $6, year = $7, status = $8, enrolled_date = $9
             WHERE id = $10`,
            [updated.studentId, updated.courseId, branch,
                updated.studyYear ?? null, updated.grade ?? null, updated.semester,
                updated.year, updated.status, updated.enrolledDate, id]
        );
        await writeAuditLog(user.id, "enrollment.updated", "enrollment", id, {
            fields: Object.keys(updateData),
            gradeChanged: updateData.grade !== undefined
        });
        const { rows } = await getPool().query(
            `SELECT id, student_id AS studentId, course_id AS courseId, branch,
                    study_year AS studyYear, grade, semester, year, status,
                    DATE_FORMAT(enrolled_date, '%Y-%m-%d') AS enrolledDate
             FROM enrollments WHERE id = $1`,
            [id]
        );
        const row = rows[0];
        return res.status(200).json({
            ...row,
            id: Number(row.id),
            studentId: Number(row.studentId),
            courseId: row.courseId === null ? null : Number(row.courseId),
            year: Number(row.year),
            studyYear: row.studyYear === null ? null : Number(row.studyYear)
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
