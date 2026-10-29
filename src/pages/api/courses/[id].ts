import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "@/lib/mock-db";
import { courseSchema } from "@/lib/validators";

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;
    const db = getDB();
    const courseId = Number(id);

    switch (req.method) {
        case "GET":
            return getCourse(courseId, db, res);
        case "PUT":
            return updateCourse(courseId, req.body, db, res);
        case "DELETE":
            return deleteCourse(courseId, db, res);
        default:
            return res.status(405).end();
    }
}

function getCourse(id: number, db: ReturnType<typeof getDB>, res: NextApiResponse) {
    const course = db.courses.find((c) => c.id === id);

    if (!course) {
        return res.status(404).json({ message: "Course not found" });
    }

    return res.status(200).json(course);
}

function updateCourse(
    id: number,
    body: any,
    db: ReturnType<typeof getDB>,
    res: NextApiResponse
) {
    const index = db.courses.findIndex((c) => c.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Course not found" });
    }

    const existingCourse = db.courses[index];
    const parsed = courseSchema.partial().safeParse(body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid payload",
            errors: parsed.error.flatten().fieldErrors
        });
    }

    const updatedCourse = {
        ...existingCourse,
        ...parsed.data,
        id // Ensure ID remains unchanged
    };

    db.courses[index] = updatedCourse;

    return res.status(200).json(updatedCourse);
}

function deleteCourse(id: number, db: ReturnType<typeof getDB>, res: NextApiResponse) {
    const index = db.courses.findIndex((c) => c.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Course not found" });
    }

    db.courses.splice(index, 1);

    return res.status(204).end();
}
