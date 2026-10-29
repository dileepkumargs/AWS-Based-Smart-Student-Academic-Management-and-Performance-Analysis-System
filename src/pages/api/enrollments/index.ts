import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "@/lib/mock-db";
import { enrollmentSchema } from "@/lib/validators";
import { Enrollment, EnrollmentWithDetails } from "@/types/enrollment";

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const db = getDB();

    switch (req.method) {
        case "GET":
            return listEnrollments(req, res, db);
        case "POST":
            return createEnrollment(req, res, db);
        default:
            return res.status(405).end();
    }
}

function listEnrollments(
    req: NextApiRequest,
    res: NextApiResponse,
    db: ReturnType<typeof getDB>
) {
    const { page = "1", limit = "10", studentId, courseId } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    let filtered = [...db.enrollments];

    // Filter by studentId if provided
    if (studentId) {
        filtered = filtered.filter(e => e.studentId === parseInt(studentId as string));
    }

    // Filter by courseId if provided
    if (courseId) {
        filtered = filtered.filter(e => e.courseId === parseInt(courseId as string));
    }

    const total = filtered.length;
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginatedData = filtered.slice(start, end);

    // Populate student and course names
    const enriched: EnrollmentWithDetails[] = paginatedData.map(enrollment => ({
        ...enrollment,
        status: enrollment.status as 'enrolled' | 'completed' | 'dropped',
        studentName: db.students.find(s => s.id === enrollment.studentId)?.name,
        courseName: db.courses.find(c => c.id === enrollment.courseId)?.name,
        courseCode: db.courses.find(c => c.id === enrollment.courseId)?.code
    }));

    return res.status(200).json({
        data: enriched,
        meta: {
            total,
            page: pageNum,
            limit: limitNum
        }
    });
}

function createEnrollment(
    req: NextApiRequest,
    res: NextApiResponse,
    db: ReturnType<typeof getDB>
) {
    const parsed = enrollmentSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid payload",
            errors: parsed.error.flatten().fieldErrors
        });
    }

    // Validate student exists
    const studentExists = db.students.some(s => s.id === parsed.data.studentId);
    if (!studentExists) {
        return res.status(404).json({ message: "Student not found" });
    }

    // Validate course exists
    const courseExists = db.courses.some(c => c.id === parsed.data.courseId);
    if (!courseExists) {
        return res.status(404).json({ message: "Course not found" });
    }

    const newEnrollment: Enrollment = {
        id: Date.now(),
        studentId: parsed.data.studentId,
        courseId: parsed.data.courseId,
        semester: parsed.data.semester,
        year: parsed.data.year,
        status: parsed.data.status,
        enrolledDate: parsed.data.enrolledDate,
        ...(parsed.data.grade && { grade: parsed.data.grade })
    };

    db.enrollments.push(newEnrollment);

    return res.status(201).json(newEnrollment);
}
