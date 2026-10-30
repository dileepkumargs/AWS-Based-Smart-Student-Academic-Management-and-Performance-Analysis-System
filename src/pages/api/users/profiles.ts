import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { requireUser } from "@/lib/auth";
import { getPagination } from "@/lib/academic-access";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res, ["SUPER_ADMIN"]);
    if (!user) return;
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).end();
    }

    const role = req.query.role;
    const { page, limit, offset } = getPagination(req, 100);
    if (role === "STUDENT") {
        const [result, count] = await Promise.all([
            getPool().query(
                `SELECT s.id, s.name, s.year, s.course, s.gpa, s.course_id AS courseId,
                        c.code AS courseCode, c.name AS courseName
                 FROM students s
                 LEFT JOIN courses c ON c.id = s.course_id
                 WHERE s.user_id IS NULL
                 ORDER BY s.name, s.id
                 LIMIT $1 OFFSET $2`,
                [limit, offset]
            ),
            getPool().query("SELECT COUNT(*) AS total FROM students WHERE user_id IS NULL")
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({
                ...row,
                id: Number(row.id),
                year: Number(row.year),
                gpa: Number(row.gpa),
                courseId: row.courseId === null ? null : Number(row.courseId)
            })),
            meta: { total: Number(count.rows[0].total), page, limit }
        });
    }
    if (role === "FACULTY") {
        const [result, count] = await Promise.all([
            getPool().query(
                `SELECT id, name, email, department, specialization, phone
                 FROM faculty WHERE user_id IS NULL
                 ORDER BY name, id LIMIT $1 OFFSET $2`,
                [limit, offset]
            ),
            getPool().query("SELECT COUNT(*) AS total FROM faculty WHERE user_id IS NULL")
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({ ...row, id: Number(row.id) })),
            meta: { total: Number(count.rows[0].total), page, limit }
        });
    }
    return res.status(400).json({ message: "Choose a valid account role." });
}
