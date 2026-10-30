import type { NextApiRequest, NextApiResponse } from "next";
import { getPool, type DatabaseValue } from "@/lib/database";
import { attendanceMarkSchema } from "@/lib/validators";
import { getPagination, getQueryString } from "@/lib/academic-access";
import { requireUser } from "@/lib/auth";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const statuses = ["present", "absent", "late"];

function getDateRange(date: string, period: string) {
    const base = new Date(`${date}T00:00:00.000Z`);
    if (period === "daily") return [date, date] as const;
    if (period === "weekly") {
        const day = base.getUTCDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        base.setUTCDate(base.getUTCDate() + mondayOffset);
        const start = base.toISOString().slice(0, 10);
        base.setUTCDate(base.getUTCDate() + 6);
        return [start, base.toISOString().slice(0, 10)] as const;
    }
    if (period === "monthly") {
        const start = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), 1));
        const end = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0));
        return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)] as const;
    }
    return [null, null] as const;
}

function addFilter(filters: string[], values: DatabaseValue[], sql: string, value: DatabaseValue) {
    values.push(value);
    filters.push(sql.replace("?", `$${values.length}`));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await requireUser(req, res);
    if (!user) return;

    if (req.method === "GET") {
        const { page, limit, offset } = getPagination(req);
        const mode = getQueryString(req, "mode") || "report";
        const courseQuery = getQueryString(req, "courseId");
        const studentQuery = getQueryString(req, "studentId");
        const semester = getQueryString(req, "semester");
        const yearQuery = getQueryString(req, "year");
        const search = getQueryString(req, "search");
        const status = getQueryString(req, "status");
        const requestedDate = getQueryString(req, "date");
        const date = requestedDate || new Date().toISOString().slice(0, 10);
        const period = getQueryString(req, "period");
        if (mode !== "report" && mode !== "roster") {
            return res.status(400).json({ message: "Invalid attendance view mode." });
        }
        if ((requestedDate && !datePattern.test(requestedDate)) || (period && !["daily", "weekly", "monthly"].includes(period))) {
            return res.status(400).json({ message: "Invalid attendance date or report period." });
        }
        if (status && !statuses.includes(status)) {
            return res.status(400).json({ message: "Invalid attendance status filter." });
        }
        const courseId = /^\d+$/.test(courseQuery) ? Number(courseQuery) : null;
        const requestedStudentId = /^\d+$/.test(studentQuery) ? Number(studentQuery) : null;
        const year = /^\d{1,4}$/.test(yearQuery) ? Number(yearQuery) : null;
        const [dateFrom, dateTo] = mode === "roster"
            ? [date, date]
            : period
                ? getDateRange(date, period)
                : requestedDate
                    ? [date, date]
                    : [null, null];
        const accessValues: DatabaseValue[] = [user.role, user.facultyId, user.studentId];
        const accessSql = "($1 = 'SUPER_ADMIN' OR $1 = 'FACULTY' OR ($1 = 'STUDENT' AND e.student_id = $3))";
        const filters: string[] = [accessSql];
        const values = [...accessValues];
        if (requestedStudentId !== null) addFilter(filters, values, "e.student_id = ?", requestedStudentId);
        if (courseId !== null) addFilter(filters, values, "e.course_id = ?", courseId);
        if (semester) addFilter(filters, values, "e.semester = ?", semester);
        if (year !== null) addFilter(filters, values, "e.year = ?", year);
        if (search) {
            values.push(search, search);
            filters.push(`(LOWER(s.name) LIKE CONCAT('%', LOWER($${values.length - 1}), '%')
                OR CAST(e.student_id AS CHAR) LIKE CONCAT('%', $${values.length}, '%'))`);
        }
        if (status) addFilter(filters, values, "a.status = ?", status);

        if (mode === "roster") {
            if (user.role === "STUDENT" || courseId === null) {
                return res.status(200).json({
                    data: [],
                    meta: { total: 0, page, limit },
                    summary: { total: 0, present: 0, absent: 0, late: 0, percentage: 0 }
                });
            }
            const rosterValues = [...values, date];
            const rosterFilters = [...filters, "e.status <> 'dropped'"];
            const from = `FROM enrollments e
                JOIN students s ON s.id = e.student_id
                JOIN courses c ON c.id = e.course_id
                LEFT JOIN users u ON u.id = s.user_id
                LEFT JOIN attendance_records a ON a.enrollment_id = e.id AND a.attendance_date = $${rosterValues.length}`;
            const where = rosterFilters.join(" AND ");
            const [result, summaryResult] = await Promise.all([
                getPool().query(
                    `SELECT e.id AS enrollmentId, e.student_id AS studentId, s.name AS studentName,
                            u.email AS studentEmail, c.id AS courseId, c.code AS courseCode, c.name AS courseName,
                            e.semester, e.year, a.status, DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendanceDate
                     ${from} WHERE ${where}
                     ORDER BY s.name LIMIT $${rosterValues.length + 1} OFFSET $${rosterValues.length + 2}`,
                    [...rosterValues, limit, offset]
                ),
                getPool().query(
                    `SELECT COUNT(*) AS total,
                            SUM(a.status = 'present') AS present,
                            SUM(a.status = 'absent') AS absent,
                            SUM(a.status = 'late') AS late,
                            SUM(a.status IN ('present', 'late')) AS attended
                     ${from} WHERE ${where}`,
                    rosterValues
                )
            ]);
            const summary = summaryResult.rows[0];
            const total = Number(summary.total || 0);
            return res.status(200).json({
                data: result.rows.map(row => ({
                    ...row,
                    enrollmentId: Number(row.enrollmentId),
                    studentId: Number(row.studentId),
                    courseId: Number(row.courseId),
                    year: Number(row.year)
                })),
                meta: { total, page, limit },
                summary: {
                    total,
                    present: Number(summary.present || 0),
                    absent: Number(summary.absent || 0),
                    late: Number(summary.late || 0),
                    percentage: total ? Math.round(Number(summary.attended || 0) * 10000 / total) / 100 : 0
                }
            });
        }

        const reportValues = [...values, dateFrom, dateTo];
        const from = `FROM attendance_records a
            JOIN enrollments e ON e.id = a.enrollment_id
            JOIN students s ON s.id = e.student_id
            JOIN courses c ON c.id = e.course_id
            LEFT JOIN users u ON u.id = s.user_id
            LEFT JOIN (
                SELECT enrollment_id, COUNT(*) AS attendanceCount,
                       SUM(status IN ('present', 'late')) AS attendedCount
                FROM attendance_records
                GROUP BY enrollment_id
            ) attendance_stats ON attendance_stats.enrollment_id = e.id`;
        const whereFilters = [
            ...filters,
            `($${reportValues.length - 1} IS NULL OR a.attendance_date >= $${reportValues.length - 1})`,
            `($${reportValues.length} IS NULL OR a.attendance_date <= $${reportValues.length})`
        ];
        const where = whereFilters.join(" AND ");
        const [result, summaryResult] = await Promise.all([
            getPool().query(
                `SELECT a.id, e.id AS enrollmentId, e.student_id AS studentId, s.name AS studentName,
                        u.email AS studentEmail, c.id AS courseId, c.code AS courseCode, c.name AS courseName,
                        e.semester, e.year, a.status, DATE_FORMAT(a.attendance_date, '%Y-%m-%d') AS attendanceDate,
                        attendance_stats.attendanceCount, attendance_stats.attendedCount
                 ${from} WHERE ${where}
                 ORDER BY a.attendance_date DESC, s.name LIMIT $${reportValues.length + 1} OFFSET $${reportValues.length + 2}`,
                [...reportValues, limit, offset]
            ),
            getPool().query(
                `SELECT COUNT(*) AS total,
                        SUM(a.status = 'present') AS present,
                        SUM(a.status = 'absent') AS absent,
                        SUM(a.status = 'late') AS late,
                        SUM(a.status IN ('present', 'late')) AS attended
                 ${from} WHERE ${where}`,
                reportValues
            )
        ]);
        const summary = summaryResult.rows[0];
        const total = Number(summary.total || 0);
        return res.status(200).json({
            data: result.rows.map(row => ({
                ...row,
                id: Number(row.id),
                enrollmentId: Number(row.enrollmentId),
                studentId: Number(row.studentId),
                courseId: Number(row.courseId),
                year: Number(row.year),
                attendanceCount: Number(row.attendanceCount),
                attendedCount: Number(row.attendedCount),
                attendancePercentage: row.attendanceCount
                    ? Math.round(Number(row.attendedCount) * 10000 / Number(row.attendanceCount)) / 100
                    : 0
            })),
            meta: { total, page, limit },
            summary: {
                total,
                present: Number(summary.present || 0),
                absent: Number(summary.absent || 0),
                late: Number(summary.late || 0),
                percentage: total ? Math.round(Number(summary.attended || 0) * 10000 / total) / 100 : 0
            }
        });
    }

    if (req.method !== "POST" && req.method !== "PUT") {
        res.setHeader("Allow", "GET, POST, PUT");
        return res.status(405).end();
    }
    if (user.role === "STUDENT") return res.status(403).json({ message: "Students cannot modify attendance." });

    const parsed = attendanceMarkSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: "Invalid attendance payload.", errors: parsed.error.flatten().fieldErrors });
    }
    if (new Set(parsed.data.records.map(record => record.studentId)).size !== parsed.data.records.length) {
        return res.status(400).json({ message: "Each student may appear only once in an attendance submission." });
    }

    const client = await getPool().connect();
    try {
        await client.beginTransaction();
        const course = await client.query(
            "SELECT id FROM courses WHERE id = $1 FOR UPDATE",
            [parsed.data.courseId]
        );
        if (!course.rows[0]) {
            await client.rollback();
            return res.status(403).json({ message: "You are not authorized to mark attendance for this course." });
        }

        for (const record of parsed.data.records) {
            const enrollment = await client.query(
                `SELECT id FROM enrollments
                 WHERE student_id = $1 AND course_id = $2 AND semester = $3 AND year = $4
                   AND status <> 'dropped' FOR UPDATE`,
                [record.studentId, parsed.data.courseId, parsed.data.semester, parsed.data.year]
            );
            if (!enrollment.rows[0]) {
                await client.rollback();
                return res.status(400).json({ message: `Student ${record.studentId} is not enrolled in the selected course and term.` });
            }
            await client.query(
                `INSERT INTO attendance_records (enrollment_id, attendance_date, status, marked_by)
                 VALUES ($1, $2, $3, $4)
                 ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), updated_at = CURRENT_TIMESTAMP(3)`,
                [enrollment.rows[0].id, parsed.data.attendanceDate, record.status, user.id]
            );
        }
        await client.query(
            `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, details)
             VALUES ($1, 'attendance.marked', 'attendance', NULL, $2)`,
            [user.id, JSON.stringify({
                courseId: parsed.data.courseId,
                attendanceDate: parsed.data.attendanceDate,
                recordCount: parsed.data.records.length
            })]
        );
        await client.commit();
        return res.status(200).json({ saved: parsed.data.records.length });
    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        client.release();
    }
}
