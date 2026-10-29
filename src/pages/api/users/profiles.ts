import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { requireUser } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res, ["SUPER_ADMIN"]);
    if (!user) return;
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).end();
    }

    const role = req.query.role;
    if (role === "STUDENT") {
        const { rows } = await getPool().query(
            "SELECT id, name, year, course FROM students WHERE user_id IS NULL ORDER BY name LIMIT 500"
        );
        return res.status(200).json({ data: rows.map(row => ({ ...row, id: Number(row.id), year: Number(row.year) })) });
    }
    if (role === "FACULTY") {
        const { rows } = await getPool().query(
            "SELECT id, name, email, department, specialization, phone FROM faculty WHERE user_id IS NULL ORDER BY name LIMIT 500"
        );
        return res.status(200).json({ data: rows.map(row => ({ ...row, id: Number(row.id) })) });
    }
    return res.status(400).json({ message: "Choose a valid account role." });
}
