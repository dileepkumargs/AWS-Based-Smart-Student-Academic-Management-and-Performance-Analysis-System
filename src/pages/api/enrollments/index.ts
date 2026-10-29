import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { enrollmentSchema } from "@/lib/validators";
import { getPagination, getQueryString, getRecordCount } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

const enrollmentSelect = `
    SELECT e.id, e.student_id AS studentId, e.course_id AS courseId, e.grade,
           e.semester, e.year, e.status, DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') AS enrolledDate,
           s.name AS studentName, c.name AS courseName, c.code AS courseCode
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN courses c ON c.id = e.course_id
    WHERE ($1 = 'SUPER_ADMIN'
        OR ($1 = 'STUDENT' AND e.student_id = $2)
        OR ($1 = 'FACULTY' AND c.faculty_id = $3))
      AND ($4 IS NULL OR e.student_id = $4)
      AND ($5 IS NULL OR e.course_id = $5)
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
        const { page, limit, offset } = getPagination(req);
        const studentQuery = getQueryString(req, "studentId");
        const courseQuery = getQueryString(req, "courseId");
        const studentId = /^\d+$/.test(studentQuery) ? Number(studentQuery) : null;
        const courseId = /^\d+$/.test(courseQuery) ? Number(courseQuery) : null;
        const values = [user.role, user.studentId, user.facultyId, studentId, courseId] as const;
        const [result, total] = await Promise.all([
            getPool().query(`${enrollmentSelect} ORDER BY e.id LIMIT $6 OFFSET $7`, [...values, limit, offset]),
            getRecordCount(`SELECT COUNT(*) AS total FROM (${enrollmentSelect}) matching`, [...values])
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({
                ...row,
                id: Number(row.id),
                studentId: Number(row.studentId),
                courseId: Number(row.courseId),
                year: Number(row.year)
            })),
            meta: { total, page, limit }
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
    }
    if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot create enrollment records." });

    const parsed = enrollmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload.", errors: parsed.error.flatten().fieldErrors });
    if (user.role === "FACULTY") {
        if (user.facultyId === null) {
            return res.status(403).json({ message: "Your faculty account is not linked to an academic profile." });
        }
        const access = await getPool().query(
            "SELECT EXISTS (SELECT 1 FROM courses WHERE id = $1 AND faculty_id = $2) AS allowed",
            [parsed.data.courseId, user.facultyId]
        );
        if (!Boolean(access.rows[0].allowed)) return res.status(403).json({ message: "You can only enroll students in your assigned courses." });
    }

    try {
        const inserted = await getPool().query(
            `INSERT INTO enrollments (student_id, course_id, grade, semester, year, status, enrolled_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [parsed.data.studentId, parsed.data.courseId, parsed.data.grade ?? null, parsed.data.semester,
                parsed.data.year, parsed.data.status, parsed.data.enrolledDate]
        );
        const { rows } = await getPool().query(
            `SELECT id, student_id AS studentId, course_id AS courseId, grade,
                    semester, year, status, DATE_FORMAT(enrolled_date, '%Y-%m-%d') AS enrolledDate
             FROM enrollments WHERE id = $1`,
            [inserted.insertId]
        );
        const enrollment = {
            ...rows[0],
            id: Number(rows[0].id),
            studentId: Number(rows[0].studentId),
            courseId: Number(rows[0].courseId),
            year: Number(rows[0].year)
        };
        await writeAuditLog(user.id, "enrollment.created", "enrollment", enrollment.id);
        return res.status(201).json(enrollment);
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "This student is already enrolled in this course for that term." });
        }
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(404).json({ message: "Student or course not found." });
        }
        throw error;
    }
}
