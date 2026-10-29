import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "@/lib/mock-db";
import { courseSchema } from "@/lib/validators";
import { Course } from "@/types/course";

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const db = getDB();

    switch (req.method) {
        case "GET":
            return getCourses(req, res, db);
        case "POST":
            return createCourse(req, res, db);
        default:
            return res.status(405).end();
    }
}

function getCourses(
    req: NextApiRequest,
    res: NextApiResponse,
    db: ReturnType<typeof getDB>
) {
    const { page = "1", limit = "10", search = "", department, credits } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    let courses: Course[] = db.courses;

    // Search by code or name
    if (search) {
        courses = courses.filter((c) =>
            c.code.toLowerCase().includes(String(search).toLowerCase()) ||
            c.name.toLowerCase().includes(String(search).toLowerCase())
        );
    }

    // 🏢 filter by department
    if (department) {
        courses = courses.filter((c) => c.department === String(department));
    }

    // 🏆 filter by credits
    if (credits) {
        courses = courses.filter((c) => c.credits === Number(credits));
    }

    const total = courses.length;
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginated = courses.slice(start, end);

    return res.status(200).json({
        data: paginated,
        meta: {
            total,
            page: pageNum,
            limit: limitNum
        }
    });
}

function createCourse(
    req: NextApiRequest,
    res: NextApiResponse,
    db: ReturnType<typeof getDB>
) {
    const parsed = courseSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid payload",
            errors: parsed.error.flatten().fieldErrors
        });
    }

    const newCourse: Course = {
        id: Date.now(),
        code: parsed.data.code,
        name: parsed.data.name,
        credits: parsed.data.credits,
        department: parsed.data.department,
        ...(parsed.data.instructor && { instructor: parsed.data.instructor })
    };

    db.courses.push(newCourse);

    return res.status(201).json(newCourse);
}
