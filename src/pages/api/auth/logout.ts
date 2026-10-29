import type { NextApiRequest, NextApiResponse } from "next";
import { clearSessionCookie, getAuthenticatedUser, revokeSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).end();
    }

    const user = await getAuthenticatedUser(req);
    await revokeSession(req);
    clearSessionCookie(res);
    if (user) {
        await writeAuditLog(user.id, "auth.logout", "user", user.id);
    }
    return res.status(204).end();
}
