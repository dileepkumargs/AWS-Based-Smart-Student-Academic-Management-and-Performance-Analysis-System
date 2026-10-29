import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { courseSchema } from "@/lib/validators";
import { getPagination, getQueryString, getRecordCount } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

const courseSelect = `
    SELECT c.id, c.code, c.name, c.credits, c.department,
           COALESCE(f.name, c.instructor) AS instructor
    FROM courses c
    LEFT JOIN faculty f ON f.id = c.faculty_id
    WHERE ($1 = 'SUPER_ADMIN'
        OR ($1 = 'FACULTY' AND c.faculty_id = $3)
        OR ($1 = 'STUDENT' AND EXISTS (
            SELECT 1 FROM enrollments e
            WHERE e.course_id = c.id AND e.student_id = $2 AND e.status <> 'dropped'
        )))
      AND ($4 = '' OR LOWER(c.code) LIKE CONCAT('%', LOWER($4), '%')
           OR LOWER(c.name) LIKE CONCAT('%', LOWER($4), '%'))
      AND ($5 = '' OR c.department = $5)
      AND ($6 IS NULL OR c.credits = $6)
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
        const { page, limit, offset } = getPagination(req);
        const search = getQueryString(req, "search");
        const department = getQueryString(req, "department");
        const credits = getQueryString(req, "credits");
        const creditsFilter = credits && /^\d+$/.test(credits) ? Number(credits) : null;
        const values = [user.role, user.studentId, user.facultyId, search, department, creditsFilter] as const;
        const [result, total] = await Promise.all([
            getPool().query(
                `${courseSelect} ORDER BY c.code LIMIT $7 OFFSET $8`,
                [...values, limit, offset]
            ),
            getRecordCount(`SELECT COUNT(*) AS total FROM (${courseSelect}) matching`, [...values])
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({ ...row, id: Number(row.id), credits: Number(row.credits) })),
            meta: { total, page, limit }
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
    }
    if (user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Only a Super Admin can create courses." });
    }
    const parsed = courseSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid payload.", errors: parsed.error.flatten().fieldErrors });
    }
    const client = await getPool().connect();
    try {
        await client.beginTransaction();
        const facultyResult = parsed.data.instructor
            ? await client.query("SELECT id FROM faculty WHERE name = $1 ORDER BY id LIMIT 1", [parsed.data.instructor])
            : { rows: [] };
        const inserted = await client.query(
            `INSERT INTO courses (code, name, credits, department, instructor, faculty_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [parsed.data.code, parsed.data.name, parsed.data.credits, parsed.data.department,
                parsed.data.instructor ?? null, facultyResult.rows[0]?.id ?? null]
        );
        const { rows } = await client.query(
            "SELECT id, code, name, credits, department, instructor FROM courses WHERE id = $1",
            [inserted.insertId]
        );
        const course = { ...rows[0], id: Number(rows[0].id), credits: Number(rows[0].credits) };
        await client.commit();
        await writeAuditLog(user.id, "course.created", "course", course.id);
        return res.status(201).json(course);
    } catch (error) {
        await client.rollback();
        if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "A course with that code already exists." });
        }
        throw error;
    } finally {
        client.release();
    }
}
