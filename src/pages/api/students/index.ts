import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { createStudentSchema } from "@/lib/validators";
import { getPagination, getQueryString, getRecordCount } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

const studentSelect = `
    SELECT s.id, s.name, s.year, s.course, s.course_id AS courseId, s.gpa, u.email,
           CASE
               WHEN u.id IS NULL THEN 'No account'
               WHEN u.is_active = TRUE THEN 'Active'
               ELSE 'Inactive'
           END AS accountStatus
    FROM students s
    LEFT JOIN users u ON u.id = s.user_id
    WHERE ($1 = 'SUPER_ADMIN'
        OR ($1 = 'STUDENT' AND s.user_id = $2)
        OR $1 = 'FACULTY')
      AND ($3 = '' OR LOWER(s.name) LIKE CONCAT('%', LOWER($3), '%')
           OR CAST(s.id AS CHAR) = $3 OR LOWER(COALESCE(u.email, '')) LIKE CONCAT('%', LOWER($3), '%'))
      AND ($4 IS NULL OR s.year = $4)
      AND ($5 = '' OR LOWER(s.course) LIKE CONCAT('%', LOWER($5), '%'))
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
        const { page, limit, offset } = getPagination(req);
        const search = getQueryString(req, "search");
        const year = getQueryString(req, "year");
        const course = getQueryString(req, "course");
        const yearFilter = year && /^\d{1,4}$/.test(year) ? Number(year) : null;
        const values = [user.role, user.id, search, yearFilter, course] as const;
        const [result, total] = await Promise.all([
            getPool().query(
                `${studentSelect} ORDER BY s.id LIMIT $6 OFFSET $7`,
                [...values, limit, offset]
            ),
            getRecordCount(
                `SELECT COUNT(*) AS total FROM (${studentSelect}) matching`,
                [...values]
            )
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({
                ...row,
                id: Number(row.id),
                year: Number(row.year),
                courseId: row.courseId === null ? null : Number(row.courseId),
                gpa: Number(row.gpa)
            })),
            meta: { total, page, limit }
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
    }
    if (user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only a Super Admin can create student records." });
    }

    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload.", errors: parsed.error.flatten().fieldErrors });
    }

    const result = await getPool().query(
        `INSERT INTO students (name, year, course, gpa)
         VALUES ($1, $2, $3, $4)`,
        [parsed.data.name, parsed.data.year, parsed.data.course, parsed.data.gpa]
    );
    const { rows } = await getPool().query(
        "SELECT id, name, year, course, gpa FROM students WHERE id = $1",
        [result.insertId]
    );
    const student = { ...rows[0], id: Number(rows[0].id), year: Number(rows[0].year), gpa: Number(rows[0].gpa) };
    await writeAuditLog(user.id, "student.created", "student", student.id);
    return res.status(201).json(student);
}
