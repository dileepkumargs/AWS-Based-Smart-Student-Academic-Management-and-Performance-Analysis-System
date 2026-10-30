import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { enrollmentSchema } from "@/lib/validators";
import { getPagination, getQueryString, getRecordCount } from "@/lib/academic-access";
import { requireUser } from "@/lib/auth";

const enrollmentSelect = `
    SELECT e.id, e.student_id AS studentId, e.course_id AS courseId, e.grade,
           e.semester, e.year, e.status, DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') AS enrolledDate,
           s.name AS studentName, u.email AS studentEmail, s.year AS studentYear,
           c.name AS courseName, c.code AS courseCode, c.department AS courseDepartment,
           c.faculty_id AS courseFacultyId
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN users u ON u.id = s.user_id
    WHERE ($1 = 'SUPER_ADMIN'
        OR ($1 = 'STUDENT' AND e.student_id = $2)
        OR $1 = 'FACULTY')
      AND ($3 IS NULL OR e.student_id = $3)
      AND ($4 IS NULL OR e.course_id = $4)
      AND ($5 = '' OR LOWER(s.name) LIKE CONCAT('%', LOWER($5), '%')
           OR CAST(e.student_id AS CHAR) LIKE CONCAT('%', $5, '%'))
      AND ($6 = '' OR e.semester = $6)
      AND ($7 IS NULL OR e.year = $7)
      AND ($8 = '' OR e.status = $8)
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
        const { page, limit, offset } = getPagination(req);
        const studentQuery = getQueryString(req, "studentId");
        const courseQuery = getQueryString(req, "courseId");
        const search = getQueryString(req, "search");
        const semester = getQueryString(req, "semester");
        const yearQuery = getQueryString(req, "year");
        const status = getQueryString(req, "status");
        const studentId = /^\d+$/.test(studentQuery) ? Number(studentQuery) : null;
        const courseId = /^\d+$/.test(courseQuery) ? Number(courseQuery) : null;
        const year = /^\d{1,4}$/.test(yearQuery) ? Number(yearQuery) : null;
        if (status && !["enrolled", "completed", "dropped"].includes(status)) {
            return res.status(400).json({ message: "Invalid enrollment status filter." });
        }
        const values = [user.role, user.studentId, studentId, courseId, search, semester, year, status] as const;
        const [result, total] = await Promise.all([
            getPool().query(`${enrollmentSelect} ORDER BY e.id DESC LIMIT $9 OFFSET $10`, [...values, limit, offset]),
            getRecordCount(`SELECT COUNT(*) AS total FROM (${enrollmentSelect}) matching`, [...values])
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({
                ...row,
                id: Number(row.id),
                studentId: Number(row.studentId),
                courseId: Number(row.courseId),
                year: Number(row.year),
                studentYear: Number(row.studentYear),
                courseFacultyId: row.courseFacultyId === null ? null : Number(row.courseFacultyId)
            })),
            meta: { total, page, limit }
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
    }
    if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot create enrollment records." });

    type EnrollmentCreateRecord = {
        studentId: number;
        courseId: number;
        grade: string | null;
        semester: string;
        year: number;
        status: "enrolled" | "completed" | "dropped";
        enrolledDate: string;
    };
    const requestBody = req.body && typeof req.body === "object" && !Array.isArray(req.body)
        ? {
            ...req.body,
            studentId: typeof req.body.studentId === "string" ? Number(req.body.studentId) : req.body.studentId,
            courseId: typeof req.body.courseId === "string" ? Number(req.body.courseId) : req.body.courseId,
            year: typeof req.body.year === "string" ? Number(req.body.year) : req.body.year
        }
        : req.body;
    const parsed = enrollmentSchema.strict().safeParse(requestBody);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload.", errors: parsed.error.flatten().fieldErrors });
    }
    const enrollmentData: EnrollmentCreateRecord = { ...parsed.data, grade: parsed.data.grade ?? null };
    const client = await getPool().connect();
    try {
        await client.beginTransaction();
        const student = await client.query(
            "SELECT id FROM students WHERE id = $1 FOR UPDATE",
            [enrollmentData.studentId]
        );
        if (!student.rows[0]) {
            await client.rollback();
            return res.status(404).json({ message: "Student not found." });
        }
        const course = await client.query(
            "SELECT id FROM courses WHERE id = $1",
            [enrollmentData.courseId]
        );
        if (!course.rows[0]) {
            await client.rollback();
            return res.status(404).json({ message: "Course not found." });
        }
        const duplicate = await client.query(
            `SELECT id FROM enrollments
             WHERE student_id = $1 AND course_id = $2 AND semester = $3 AND year = $4`,
            [enrollmentData.studentId, enrollmentData.courseId, enrollmentData.semester, enrollmentData.year]
        );
        if (duplicate.rows[0]) {
            await client.rollback();
            return res.status(409).json({ message: "This student already has an enrollment for that course and term." });
        }

        const inserted = await client.query(
            `INSERT INTO enrollments (student_id, course_id, grade, semester, year, status, enrolled_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [enrollmentData.studentId, enrollmentData.courseId, enrollmentData.grade, enrollmentData.semester,
                enrollmentData.year, enrollmentData.status, enrollmentData.enrolledDate]
        );
        const { rows } = await client.query(
            `SELECT e.id, e.student_id AS studentId, e.course_id AS courseId, e.grade,
                    e.semester, e.year, e.status, DATE_FORMAT(e.enrolled_date, '%Y-%m-%d') AS enrolledDate,
                    s.name AS studentName, u.email AS studentEmail, s.year AS studentYear,
                    c.name AS courseName, c.code AS courseCode, c.department AS courseDepartment,
                    c.faculty_id AS courseFacultyId
             FROM enrollments e
             JOIN students s ON s.id = e.student_id
             JOIN courses c ON c.id = e.course_id
             LEFT JOIN users u ON u.id = s.user_id
             WHERE e.id = $1`,
            [inserted.insertId]
        );
        const enrollment = {
            ...rows[0],
            id: Number(rows[0].id),
            studentId: Number(rows[0].studentId),
            courseId: Number(rows[0].courseId),
            year: Number(rows[0].year),
            studentYear: Number(rows[0].studentYear),
            courseFacultyId: rows[0].courseFacultyId === null ? null : Number(rows[0].courseFacultyId)
        };
        await client.query(
            `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, details)
             VALUES ($1, 'enrollment.created', 'enrollment', $2, $3)`,
            [user.id, String(enrollment.id), JSON.stringify({ studentId: enrollment.studentId, courseId: enrollment.courseId })]
        );
        await client.commit();
        return res.status(201).json(enrollment);
    } catch (error) {
        await client.rollback();
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "This student is already enrolled in this course for that term." });
        }
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(404).json({ message: "Student or course not found." });
        }
        throw error;
    } finally {
        client.release();
    }
}
