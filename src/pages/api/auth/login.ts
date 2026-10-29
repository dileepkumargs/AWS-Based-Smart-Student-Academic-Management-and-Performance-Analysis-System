import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
    authenticateCredentials,
    createSession,
    setSessionCookie,
    writeAuditLog
} from "@/lib/auth";

const loginSchema = z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(256),
    role: z.enum(["SUPER_ADMIN", "FACULTY", "STUDENT"])
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader("Cache-Control", "no-store");
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).end();
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Enter a valid email address and password." });
    }

    const ipAddress = req.socket.remoteAddress || "unknown";
    const credentials = await authenticateCredentials(
        parsed.data.email,
        parsed.data.password,
        parsed.data.role,
        ipAddress
    );
    if (!credentials) {
        return res.status(401).json({ message: "The email or password is incorrect." });
    }

    const token = await createSession(credentials.userId);
    setSessionCookie(res, token);
    await writeAuditLog(credentials.userId, "auth.login", "user", credentials.userId);
    return res.status(200).json({ ok: true, mustChangePassword: credentials.mustChangePassword });
}
