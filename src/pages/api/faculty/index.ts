import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { facultySchema } from "@/lib/validators";
import { getPagination, getQueryString, getRecordCount } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

const facultySelect = `
    SELECT f.id, f.name, f.email, f.department, f.specialization, f.phone
    FROM faculty f
    WHERE ($1 = 'SUPER_ADMIN' OR ($1 = 'FACULTY' AND f.user_id = $2))
      AND ($3 = '' OR LOWER(f.name) LIKE CONCAT('%', LOWER($3), '%')
           OR LOWER(f.email) LIKE CONCAT('%', LOWER($3), '%')
           OR LOWER(f.department) LIKE CONCAT('%', LOWER($3), '%'))
      AND ($4 = '' OR f.department = $4)
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
        if (user.role === "STUDENT") return res.status(403).json({ message: "Faculty directory access is not available." });
        const { page, limit, offset } = getPagination(req);
        const search = getQueryString(req, "search");
        const department = getQueryString(req, "department");
        const values = [user.role, user.id, search, department] as const;
        const [result, total] = await Promise.all([
            getPool().query(`${facultySelect} ORDER BY f.name LIMIT $5 OFFSET $6`, [...values, limit, offset]),
            getRecordCount(`SELECT COUNT(*) AS total FROM (${facultySelect}) matching`, [...values])
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({ ...row, id: Number(row.id) })),
            meta: { total, page, limit }
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
    }
    if (user.role !== "SUPER_ADMIN") return res.status(403).json({ message: "Only a Super Admin can create faculty records." });

    const parsed = facultySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid payload.", errors: parsed.error.flatten().fieldErrors });
    const result = await getPool().query(
        `INSERT INTO faculty (name, email, department, specialization, phone)
         VALUES ($1, LOWER($2), $3, $4, $5)`,
        [parsed.data.name, parsed.data.email, parsed.data.department, parsed.data.specialization, parsed.data.phone ?? null]
    );
    const { rows } = await getPool().query(
        "SELECT id, name, email, department, specialization, phone FROM faculty WHERE id = $1",
        [result.insertId]
    );
    const faculty = { ...rows[0], id: Number(rows[0].id) };
    await writeAuditLog(user.id, "faculty.created", "faculty", faculty.id);
    return res.status(201).json(faculty);
}
