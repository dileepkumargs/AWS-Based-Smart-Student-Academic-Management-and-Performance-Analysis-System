import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { timetableEntrySchema } from "@/lib/validators";
import { requireUser, writeAuditLog } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;
    const id = Number(req.query.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: "Invalid timetable entry ID." });
    if (req.method !== "PUT" && req.method !== "DELETE") {
        res.setHeader("Allow", "PUT, DELETE");
        return res.status(405).end();
    }
    if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot manage timetable entries." });

    const { rows: currentRows } = await getPool().query(
        `SELECT t.id, t.course_id AS courseId, t.faculty_id AS facultyId
         FROM timetable_entries t WHERE t.id = $1`,
        [id]
    );
    if (!currentRows[0]) return res.status(404).json({ message: "Timetable entry not found." });
    if (user.role === "FACULTY" && (
        user.facultyId === null || Number(currentRows[0].facultyId) !== user.facultyId
    )) {
        return res.status(403).json({ message: "You are not authorized to manage this timetable entry." });
    }

    if (req.method === "DELETE") {
        await getPool().query("DELETE FROM timetable_entries WHERE id = $1", [id]);
        await writeAuditLog(user.id, "timetable.deleted", "timetable_entry", id);
        return res.status(204).end();
    }

    const parsed = timetableEntrySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid timetable payload.", errors: parsed.error.flatten().fieldErrors });
    }
    const { rows: courseRows } = await getPool().query(
        "SELECT id, faculty_id AS facultyId FROM courses WHERE id = $1",
        [parsed.data.courseId]
    );
    if (!courseRows[0]) {
        return res.status(404).json({ message: "The selected course was not found." });
    }
    const assignedFacultyId = courseRows[0].facultyId === null ? null : Number(courseRows[0].facultyId);
    if (user.role === "FACULTY" && user.facultyId === null) {
        return res.status(403).json({ message: "Your faculty profile is not linked to this account." });
    }
    if (user.role === "SUPER_ADMIN" && assignedFacultyId === null) {
        return res.status(403).json({ message: "You are not authorized to schedule this course." });
    }
    const facultyId = user.role === "FACULTY" ? user.facultyId : assignedFacultyId;
    if (facultyId === null) {
        return res.status(400).json({ message: "A faculty profile is required to schedule this course." });
    }
    const conflict = await getPool().query(
        `SELECT id FROM timetable_entries
         WHERE id <> $1 AND semester = $2 AND year = $3
           AND start_time < $4 AND end_time > $5
           AND (faculty_id = $6 OR course_id = $7 OR LOWER(location) = LOWER($8))
           AND (
               (schedule_type = 'class' AND $9 = 'class' AND day_of_week = $10) OR
               (schedule_type = 'examination' AND $9 = 'examination' AND event_date = $11) OR
               ($9 = 'examination' AND schedule_type = 'class' AND day_of_week = DAYNAME($11)) OR
               ($9 = 'class' AND schedule_type = 'examination' AND DAYNAME(event_date) = $10)
           )
         LIMIT 1`,
        [id, parsed.data.semester, parsed.data.year, parsed.data.endTime, parsed.data.startTime,
            facultyId, parsed.data.courseId, parsed.data.location, parsed.data.scheduleType,
            parsed.data.dayOfWeek, parsed.data.eventDate]
    );
    if (conflict.rows[0]) return res.status(409).json({ message: "This schedule conflicts with another class or examination for the faculty member, course, or location." });

    await getPool().query(
        `UPDATE timetable_entries SET course_id = $1, faculty_id = $2, semester = $3, year = $4,
             schedule_type = $5, day_of_week = $6, event_date = $7, title = $8,
             start_time = $9, end_time = $10, location = $11, updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = $12`,
        [parsed.data.courseId, facultyId, parsed.data.semester, parsed.data.year, parsed.data.scheduleType,
            parsed.data.dayOfWeek, parsed.data.eventDate, parsed.data.title, parsed.data.startTime,
            parsed.data.endTime, parsed.data.location, id]
    );
    await writeAuditLog(user.id, "timetable.updated", "timetable_entry", id, {
        courseId: parsed.data.courseId,
        scheduleType: parsed.data.scheduleType
    });
    return res.status(200).json({ id, ...parsed.data, facultyId });
}
