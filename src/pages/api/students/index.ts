import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "@/lib/mock-db";
import { createStudentSchema } from "@/lib/validators";
import { Student } from "@/types/student";

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const db = getDB();

    switch (req.method) {
        case "GET":
            return getStudents(req, res, db);
        case "POST":
            return createStudent(req, res, db);
        default:
            return res.status(405).end();
    }
}

function getStudents(
    req: NextApiRequest,
    res: NextApiResponse,
    db: ReturnType<typeof getDB>
) {
    const { page = "1", limit = "10", search = "", year, course } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    let students: Student[] = db.students;

    // 🔍 search
    if (search) {
        students = students.filter((s) =>
            s.name.toLowerCase().includes(String(search).toLowerCase())
        );
    }

    // 📅 filter by year
    if (year) {
        students = students.filter((s) => s.year === Number(year));
    }

    // 📚 filter by course (department-like)
    if (course) {
        students = students.filter((s) => s.course === String(course));
    }

    const total = students.length;

    // 📄 pagination
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginated = students.slice(start, end);

    return res.status(200).json({
        data: paginated,
        meta: {
            total,
            page: pageNum,
            limit: limitNum
        }
    });
}

function createStudent(
    req: NextApiRequest,
    res: NextApiResponse,
    db: ReturnType<typeof getDB>
) {
    const parsed = createStudentSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid payload",
            errors: parsed.error.flatten().fieldErrors
        });
    }

    const newStudent: Student = {
        id: Date.now(),
        ...parsed.data
    };

    db.students.push(newStudent);

    return res.status(201).json(newStudent);
}
