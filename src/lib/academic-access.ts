import type { NextApiRequest } from "next";
import { getPool, type DatabaseValue } from "@/lib/database";
import type { AuthUser } from "@/lib/auth";

export async function canAccessStudent(user: AuthUser, studentId: number) {
    if (user.role === "SUPER_ADMIN") return true;
    if (user.role === "STUDENT") return user.studentId === studentId;
    return user.role === "FACULTY";
}

export async function canAccessCourse(user: AuthUser, courseId: number) {
    if (user.role === "SUPER_ADMIN") return true;
    if (user.role === "FACULTY") {
        if (user.facultyId === null) return false;
        const { rows } = await getPool().query(
            "SELECT EXISTS (SELECT 1 FROM courses WHERE id = $1 AND faculty_id = $2) AS allowed",
            [courseId, user.facultyId]
        );
        return Boolean(rows[0].allowed);
    }
    if (user.studentId === null) return false;
    const { rows } = await getPool().query(
        `SELECT EXISTS (SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2 AND status <> 'dropped') AS allowed`,
        [courseId, user.studentId]
    );
    return Boolean(rows[0].allowed);
}

export async function canAccessEnrollment(user: AuthUser, enrollmentId: number) {
    if (user.role === "SUPER_ADMIN") return true;
    const { rows } = await getPool().query(
        `SELECT student_id, course_id FROM enrollments WHERE id = $1`,
        [enrollmentId]
    );
    if (!rows[0]) return false;
    if (user.role === "STUDENT") return user.studentId === Number(rows[0].student_id);
    return user.role === "FACULTY";
}

export async function canEditEnrollment(user: AuthUser, enrollmentId: number) {
    if (user.role !== "FACULTY") return canAccessEnrollment(user, enrollmentId);
    if (user.facultyId === null) return false;
    const { rows: courses } = await getPool().query(
        `SELECT EXISTS (
            SELECT 1 FROM enrollments e
            JOIN courses c ON c.id = e.course_id
            WHERE e.id = $1 AND c.faculty_id = $2
        ) AS allowed`,
        [enrollmentId, user.facultyId]
    );
    return Boolean(courses[0].allowed);
}

export function getPagination(req: NextApiRequest, defaultLimit = 10) {
    const pageValue = Number(req.query.page ?? 1);
    const limitValue = Number(req.query.limit ?? defaultLimit);
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const limit = Number.isSafeInteger(limitValue) && limitValue > 0 ? Math.min(limitValue, 100) : defaultLimit;
    return { page, limit, offset: (page - 1) * limit };
}

export function getQueryString(req: NextApiRequest, key: string) {
    const value = req.query[key];
    return typeof value === "string" ? value.trim() : "";
}

export async function getRecordCount(sql: string, values: readonly DatabaseValue[] = []) {
    const { rows } = await getPool().query(sql, values);
    return Number(rows[0].total);
}
