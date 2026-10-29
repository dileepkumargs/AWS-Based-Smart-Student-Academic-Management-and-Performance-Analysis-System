import type { NextApiRequest, NextApiResponse } from "next";
import { requireUser } from "@/lib/auth";
import { getPool } from "@/lib/database";
import { getPagination } from "@/lib/academic-access";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res, ["SUPER_ADMIN"]);
    if (!user) return;
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).end();
    }

    const { page, limit, offset } = getPagination(req, 50);
    const [logs, count] = await Promise.all([
        getPool().query(
            `SELECT id, actor_user_id AS actorUserId, action, resource_type AS resourceType,
                    resource_id AS resourceId, details, created_at AS createdAt
             FROM audit_logs ORDER BY id DESC LIMIT $1 OFFSET $2`,
            [limit, offset]
        ),
        getPool().query("SELECT COUNT(*) AS total FROM audit_logs")
    ]);
    return res.status(200).json({ data: logs.rows, meta: { total: Number(count.rows[0].total), page, limit } });
}
