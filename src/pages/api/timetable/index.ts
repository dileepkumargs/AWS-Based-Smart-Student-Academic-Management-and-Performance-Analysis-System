import type { NextApiRequest, NextApiResponse } from "next";
import { getPool } from "@/lib/database";
import { timetableEntrySchema } from "@/lib/validators";
import { getPagination, getQueryString } from "@/lib/academic-access";
import { requireUser, writeAuditLog } from "@/lib/auth";

const timetableSelect = `
    SELECT t.id, t.course_id AS courseId, c.code AS courseCode, c.name AS courseName,
           c.branch AS courseBranch,
           t.faculty_id AS facultyId, f.name AS facultyName, t.semester, t.year,
           t.schedule_type AS scheduleType, t.day_of_week AS dayOfWeek,
           DATE_FORMAT(t.event_date, '%Y-%m-%d') AS eventDate,
           t.title, TIME_FORMAT(t.start_time, '%H:%i') AS startTime,
           TIME_FORMAT(t.end_time, '%H:%i') AS endTime, t.location
    FROM timetable_entries t
    JOIN courses c ON c.id = t.course_id
    JOIN faculty f ON f.id = t.faculty_id
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
        const { page, limit, offset } = getPagination(req);
        const courseQuery = getQueryString(req, "courseId");
        const studentQuery = getQueryString(req, "studentId");
        const semester = getQueryString(req, "semester");
        const yearQuery = getQueryString(req, "year");
        const courseId = /^\d+$/.test(courseQuery) ? Number(courseQuery) : null;
        const requestedStudentId = /^\d+$/.test(studentQuery) ? Number(studentQuery) : null;
        const year = /^\d{1,4}$/.test(yearQuery) ? Number(yearQuery) : null;
        const filters: string[] = [
            "($1 = 'SUPER_ADMIN' OR ($1 = 'FACULTY' AND (t.faculty_id = $2 OR t.created_by = $4)) OR ($1 = 'STUDENT' AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = t.course_id AND e.student_id = $3 AND e.semester = t.semester AND e.year = t.year AND e.status <> 'dropped')))"
        ];
        const values: (string | number | null)[] = [user.role, user.facultyId, user.studentId, user.id];
        if (requestedStudentId !== null) {
            values.push(requestedStudentId);
            filters.push(`EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = t.course_id AND e.student_id = $${values.length} AND e.semester = t.semester AND e.year = t.year AND e.status <> 'dropped')`);
        }
        if (courseId !== null) {
            values.push(courseId);
            filters.push(`t.course_id = $${values.length}`);
        }
        if (semester) {
            values.push(semester);
            filters.push(`t.semester = $${values.length}`);
        }
        if (year !== null) {
            values.push(year);
            filters.push(`t.year = $${values.length}`);
        }
        if (getQueryString(req, "upcomingExams") === "true") {
            filters.push("t.schedule_type = 'examination' AND t.event_date >= CURRENT_DATE");
        }
        const where = filters.join(" AND ");
        const [result, count] = await Promise.all([
            getPool().query(
                `${timetableSelect} WHERE ${where}
                 ORDER BY CASE WHEN t.schedule_type = 'class' THEN 0 ELSE 1 END,
                          t.day_of_week, t.event_date, t.start_time
                 LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
                [...values, limit, offset]
            ),
            getPool().query(
                `SELECT COUNT(*) AS total FROM timetable_entries t
                 JOIN courses c ON c.id = t.course_id
                 JOIN faculty f ON f.id = t.faculty_id
                 WHERE ${where}`,
                values
            )
        ]);
        return res.status(200).json({
            data: result.rows.map(row => ({
                ...row,
                id: Number(row.id),
                courseId: Number(row.courseId),
                facultyId: Number(row.facultyId),
                year: Number(row.year)
            })),
            meta: { total: Number(count.rows[0].total), page, limit }
        });
    }

    if (req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).end();
    }
    if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot manage timetable entries." });

    const parsed = timetableEntrySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid timetable payload.", errors: parsed.error.flatten().fieldErrors });
    }
    const { rows: courseRows } = await getPool().query(
        "SELECT id, faculty_id AS facultyId FROM courses WHERE id = $1",
        [parsed.data.courseId]
    );
    if (!courseRows[0]) {
        return res.status(403).json({ message: "You are not authorized to schedule this course." });
    }
    const assignedFacultyId = courseRows[0].facultyId === null ? null : Number(courseRows[0].facultyId);
    if (user.role === "FACULTY" && user.facultyId === null) {
        return res.status(403).json({ message: "Your faculty profile is not linked to this account." });
    }
    if (user.role === "SUPER_ADMIN" && assignedFacultyId === null) {
        return res.status(400).json({ message: "Assign a faculty member to this course before scheduling it." });
    }

    const facultyId = user.role === "FACULTY" ? user.facultyId : assignedFacultyId;
    if (facultyId === null) {
        return res.status(400).json({ message: "A faculty profile is required to schedule this course." });
    }
    const conflict = await getPool().query(
        `SELECT id FROM timetable_entries
         WHERE semester = $1 AND year = $2
           AND start_time < $3 AND end_time > $4
           AND (faculty_id = $5 OR course_id = $6 OR LOWER(location) = LOWER($7))
           AND (
               (schedule_type = 'class' AND $8 = 'class' AND day_of_week = $9) OR
               (schedule_type = 'examination' AND $8 = 'examination' AND event_date = $10) OR
               ($8 = 'examination' AND schedule_type = 'class' AND day_of_week = DAYNAME($10)) OR
               ($8 = 'class' AND schedule_type = 'examination' AND DAYNAME(event_date) = $9)
           )
         LIMIT 1`,
        [parsed.data.semester, parsed.data.year, parsed.data.endTime, parsed.data.startTime,
            facultyId, parsed.data.courseId, parsed.data.location, parsed.data.scheduleType,
            parsed.data.dayOfWeek, parsed.data.eventDate]
    );
    if (conflict.rows[0]) return res.status(409).json({ message: "This schedule conflicts with another class or examination for the faculty member, course, or location." });

    const result = await getPool().query(
        `INSERT INTO timetable_entries
            (course_id, faculty_id, semester, year, schedule_type, day_of_week, event_date,
             title, start_time, end_time, location, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [parsed.data.courseId, facultyId, parsed.data.semester, parsed.data.year, parsed.data.scheduleType,
            parsed.data.dayOfWeek, parsed.data.eventDate, parsed.data.title,
            parsed.data.startTime, parsed.data.endTime, parsed.data.location, user.id]
    );
    await writeAuditLog(user.id, "timetable.created", "timetable_entry", result.insertId, {
        courseId: parsed.data.courseId,
        scheduleType: parsed.data.scheduleType
    });
    return res.status(201).json({ id: result.insertId, ...parsed.data, facultyId });
}
