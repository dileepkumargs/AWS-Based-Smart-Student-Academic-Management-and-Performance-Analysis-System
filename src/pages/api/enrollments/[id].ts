import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "@/lib/mock-db";
import { enrollmentSchema } from "@/lib/validators";
import { Enrollment, EnrollmentWithDetails } from "@/types/enrollment";

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;
    const db = getDB();
    const enrollmentId = Number(id);

    switch (req.method) {
        case "GET":
            return getEnrollment(enrollmentId, db, res);
        case "PUT":
            return updateEnrollment(enrollmentId, req.body, db, res);
        case "DELETE":
            return deleteEnrollment(enrollmentId, db, res);
        default:
            return res.status(405).end();
    }
}

function getEnrollment(
    id: number,
    db: ReturnType<typeof getDB>,
    res: NextApiResponse
) {
    const enrollment = db.enrollments.find((e) => e.id === id);

    if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
    }

    // Enrich with student and course data
    const enriched: EnrollmentWithDetails = {
        ...enrollment,
        status: enrollment.status as 'enrolled' | 'completed' | 'dropped',
        studentName: db.students.find(s => s.id === enrollment.studentId)?.name,
        courseName: db.courses.find(c => c.id === enrollment.courseId)?.name,
        courseCode: db.courses.find(c => c.id === enrollment.courseId)?.code
    };

    return res.status(200).json(enriched);
}

function updateEnrollment(
    id: number,
    body: any,
    db: ReturnType<typeof getDB>,
    res: NextApiResponse
) {
    const index = db.enrollments.findIndex((e) => e.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Enrollment not found" });
    }

    const existingEnrollment = db.enrollments[index];
    const parsed = enrollmentSchema.partial().safeParse(body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid payload",
            errors: parsed.error.flatten().fieldErrors
        });
    }

    const updatedEnrollment: Enrollment = {
        ...existingEnrollment,
        ...parsed.data,
        id // Ensure ID remains unchanged
    };

    db.enrollments[index] = updatedEnrollment;

    return res.status(200).json(updatedEnrollment);
}

function deleteEnrollment(
    id: number,
    db: ReturnType<typeof getDB>,
    res: NextApiResponse
) {
    const index = db.enrollments.findIndex((e) => e.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Enrollment not found" });
    }

    db.enrollments.splice(index, 1);

    return res.status(204).end();
}
