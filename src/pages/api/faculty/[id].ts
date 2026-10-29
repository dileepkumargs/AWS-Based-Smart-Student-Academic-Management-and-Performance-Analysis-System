import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "@/lib/mock-db";
import { facultySchema } from "@/lib/validators";
import { Faculty } from "@/types/faculty";

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;
    const db = getDB();
    const facultyId = Number(id);

    switch (req.method) {
        case "GET":
            return getFaculty(facultyId, db, res);
        case "PUT":
            return updateFaculty(facultyId, req.body, db, res);
        case "DELETE":
            return deleteFaculty(facultyId, db, res);
        default:
            return res.status(405).end();
    }
}

function getFaculty(id: number, db: ReturnType<typeof getDB>, res: NextApiResponse) {
    const faculty = db.faculty.find((f) => f.id === id);

    if (!faculty) {
        return res.status(404).json({ message: "Faculty not found" });
    }

    return res.status(200).json(faculty);
}

function updateFaculty(
    id: number,
    body: any,
    db: ReturnType<typeof getDB>,
    res: NextApiResponse
) {
    const index = db.faculty.findIndex((f) => f.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Faculty not found" });
    }

    const existingFaculty = db.faculty[index];
    const parsed = facultySchema.partial().safeParse(body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid payload",
            errors: parsed.error.flatten().fieldErrors
        });
    }

    const updatedFaculty: Faculty = {
        ...existingFaculty,
        ...parsed.data,
        id // Ensure ID remains unchanged
    };

    db.faculty[index] = updatedFaculty;

    return res.status(200).json(updatedFaculty);
}

function deleteFaculty(id: number, db: ReturnType<typeof getDB>, res: NextApiResponse) {
    const index = db.faculty.findIndex((f) => f.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Faculty not found" });
    }

    db.faculty.splice(index, 1);

    return res.status(204).end();
}
