import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "@/lib/mock-db";
import { facultySchema } from "@/lib/validators";
import { Faculty } from "@/types/faculty";

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const db = getDB();

    switch (req.method) {
        case "GET":
            return getFaculty(req, res, db);
        case "POST":
            return createFaculty(req, res, db);
        default:
            return res.status(405).end();
    }
}

function getFaculty(
    req: NextApiRequest,
    res: NextApiResponse,
    db: ReturnType<typeof getDB>
) {
    const { page = "1", limit = "10", search = "", department } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);

    let faculty: Faculty[] = db.faculty;

    // Search by name, email, or department
    if (search) {
        faculty = faculty.filter((f) =>
            f.name.toLowerCase().includes(String(search).toLowerCase()) ||
            f.email.toLowerCase().includes(String(search).toLowerCase()) ||
            f.department.toLowerCase().includes(String(search).toLowerCase())
        );
    }

    // 🏢 filter by department
    if (department) {
        faculty = faculty.filter((f) => f.department === String(department));
    }

    const total = faculty.length;
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginated = faculty.slice(start, end);

    return res.status(200).json({
        data: paginated,
        meta: {
            total,
            page: pageNum,
            limit: limitNum
        }
    });
}

function createFaculty(
    req: NextApiRequest,
    res: NextApiResponse,
    db: ReturnType<typeof getDB>
) {
    const parsed = facultySchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid payload",
            errors: parsed.error.flatten().fieldErrors
        });
    }

    const newFaculty: Faculty = {
        id: Date.now(),
        name: parsed.data.name,
        email: parsed.data.email,
        department: parsed.data.department,
        specialization: parsed.data.specialization,
        ...(parsed.data.phone && { phone: parsed.data.phone })
    };

    db.faculty.push(newFaculty);

    return res.status(201).json(newFaculty);
}
