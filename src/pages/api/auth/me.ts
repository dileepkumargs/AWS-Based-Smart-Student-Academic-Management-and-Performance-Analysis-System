import type { NextApiRequest, NextApiResponse } from "next";
import { getAuthenticatedUser } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).end();
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
        return res.status(401).json({ message: "Authentication required." });
    }
    return res.status(200).json({ user });
}
