import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { announcementSchema } from "@/lib/validators";
import { getPagination, getQueryString } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

const announcementSelect = `
    SELECT a.id, a.course_id AS courseId, c.code AS courseCode, c.name AS courseName,
           c.branch AS courseBranch,
           a.title, a.description, a.category,
           DATE_FORMAT(a.publication_date, '%Y-%m-%d') AS publicationDate,
           DATE_FORMAT(a.expiry_date, '%Y-%m-%d') AS expiryDate,
           a.is_pinned AS isPinned, a.created_by AS createdBy,
           DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
    FROM announcements a
    JOIN courses c ON c.id = a.course_id
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
        const { page, limit, offset } = getPagination(req);
        const search = getQueryString(req, "search");
        const studentQuery = getQueryString(req, "studentId");
        const courseQuery = getQueryString(req, "courseId");
        const category = getQueryString(req, "category");
        const courseId = /^\d+$/.test(courseQuery) ? Number(courseQuery) : null;
        const requestedStudentId = /^\d+$/.test(studentQuery) ? Number(studentQuery) : null;
        const categories = ["general_notice", "examination_schedule", "assignment", "important_notice"];
        if (category && !categories.includes(category)) {
            return res.status(400).json({ message: "Invalid announcement category filter." });
        }
        const filters: string[] = [
            "($1 = 'SUPER_ADMIN' OR ($1 = 'FACULTY' AND (c.faculty_id = $2 OR a.created_by = $4)) OR ($1 = 'STUDENT' AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $3 AND e.status <> 'dropped')))"
        ];
        const values: (string | number | null)[] = [user.role, user.facultyId, user.studentId, user.id];
        if (user.role === "STUDENT") {
            filters.push("a.publication_date <= CURRENT_DATE AND (a.expiry_date IS NULL OR a.expiry_date >= CURRENT_DATE)");
        }
        if (requestedStudentId !== null) {
            values.push(requestedStudentId);
            filters.push(`EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = $${values.length} AND e.status <> 'dropped')`);
        }
        if (courseId !== null) {
            values.push(courseId);
            filters.push(`a.course_id = $${values.length}`);
        }
        if (category) {
            values.push(category);
            filters.push(`a.category = $${values.length}`);
        }
        if (search) {
            values.push(search, search);
            filters.push(`(LOWER(a.title) LIKE CONCAT('%', LOWER($${values.length - 1}), '%')
                OR LOWER(a.description) LIKE CONCAT('%', LOWER($${values.length}), '%'))`);
        }
        const where = filters.join(" AND ");
        const [result, count] = await Promise.all([
            getPool().query(
                `${announcementSelect} WHERE ${where}
                 ORDER BY a.is_pinned DESC, a.publication_date DESC, a.id DESC
                 LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
                [...values, limit, offset]
            ),
            getPool().query(
                `SELECT COUNT(*) AS total FROM announcements a JOIN courses c ON c.id = a.course_id WHERE ${where}`,
                values
            )
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({
                ...row,
                id: Number(row.id),
                courseId: Number(row.courseId),
                createdBy: Number(row.createdBy),
                isPinned: Boolean(row.isPinned)
            })),
            meta: { total: Number(count.rows[0].total), page, limit }
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
    }
    if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot publish announcements." });

    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid announcement payload.", errors: parsed.error.flatten().fieldErrors });
    }
    const course = await getPool().query("SELECT id FROM courses WHERE id = $1", [parsed.data.courseId]);
    if (!course.rows[0]) {
        return res.status(403).json({ message: "You are not authorized to publish announcements for this course." });
    }

    const result = await getPool().query(
        `INSERT INTO announcements
            (course_id, title, description, category, publication_date, expiry_date, is_pinned, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [parsed.data.courseId, parsed.data.title, parsed.data.description, parsed.data.category,
            parsed.data.publicationDate, parsed.data.expiryDate, parsed.data.isPinned, user.id]
    );
    await writeAuditLog(user.id, "announcement.created", "announcement", result.insertId, {
        courseId: parsed.data.courseId,
        category: parsed.data.category
    });
    return res.status(201).json({ id: result.insertId, ...parsed.data });
}
