import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { announcementSchema } from "@/lib/validators";
import { requireUser, writeAuditLog } from "@/lib/auth";

async function canManageAnnouncement(user: { role: string; id: number; facultyId: number | null }, id: number) {
    if (user.role === "SUPER_ADMIN") return true;
    if (user.role !== "FACULTY") return false;
    const { rows } = await getPool().query(
        `SELECT EXISTS (
            SELECT 1 FROM announcements a
            WHERE a.id = $1 AND a.created_by = $2
        ) AS allowed`,
        [id, user.id]
    );
    return Boolean(rows[0].allowed);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.query.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid announcement ID." });

    if (req.method !== "PUT" && req.method !== "DELETE") {
        res.setHeader("Allow", "PUT, DELETE");
        return res.status(405).end();
    }
    if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot modify announcements." });
    if (!(await canManageAnnouncement(user, id))) {
        return res.status(403).json({ message: "You are not authorized to manage this announcement." });
    }

    if (req.method === "DELETE") {
        const result = await getPool().query("DELETE FROM announcements WHERE id = $1", [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: "Announcement not found." });
        await writeAuditLog(user.id, "announcement.deleted", "announcement", id);
        return res.status(204).end();
    }

    const parsed = announcementSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid announcement payload.", errors: parsed.error.flatten().fieldErrors });
    }
    const course = await getPool().query("SELECT id FROM courses WHERE id = $1", [parsed.data.courseId]);
    if (!course.rows[0]) return res.status(403).json({ message: "You are not authorized to use this course." });
    await getPool().query(
        `UPDATE announcements SET course_id = $1, title = $2, description = $3, category = $4,
             publication_date = $5, expiry_date = $6, is_pinned = $7, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = $8`,
        [parsed.data.courseId, parsed.data.title, parsed.data.description, parsed.data.category,
            parsed.data.publicationDate, parsed.data.expiryDate, parsed.data.isPinned, id]
    );
    await writeAuditLog(user.id, "announcement.updated", "announcement", id, {
        courseId: parsed.data.courseId,
        category: parsed.data.category
    });
    return res.status(200).json({ id, ...parsed.data });
}
