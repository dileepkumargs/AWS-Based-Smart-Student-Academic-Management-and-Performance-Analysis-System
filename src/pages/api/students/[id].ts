import type { NextApiRequest, NextApiResponse } from "next";
import { getDB } from "@/lib/mock-db";
import { studentSchema } from "@/lib/validators";

export default function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { id } = req.query;
    const db = getDB();
    const studentId = Number(id);

    switch (req.method) {
        case "GET":
            return getStudent(studentId, db, res);
        case "PUT":
            return updateStudent(studentId, req.body, db, res);
        case "DELETE":
            return deleteStudent(studentId, db, res);
        default:
            return res.status(405).end();
    }
}

function getStudent(id: number, db: ReturnType<typeof getDB>, res: NextApiResponse) {
    const student = db.students.find((s) => s.id === id);

    if (!student) {
        return res.status(404).json({ message: "Student not found" });
    }

    return res.status(200).json(student);
}

function updateStudent(
    id: number,
    body: any,
    db: ReturnType<typeof getDB>,
    res: NextApiResponse
) {
    const index = db.students.findIndex((s) => s.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Student not found" });
    }

    const existingStudent = db.students[index];
    const parsed = studentSchema.partial().safeParse(body);

    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid payload",
            errors: parsed.error.flatten().fieldErrors
        });
    }

    const updatedStudent = {
        ...existingStudent,
        ...parsed.data,
        id // Ensure ID remains unchanged
    };

    db.students[index] = updatedStudent;

    return res.status(200).json(updatedStudent);
}

function deleteStudent(id: number, db: ReturnType<typeof getDB>, res: NextApiResponse) {
    const index = db.students.findIndex((s) => s.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Student not found" });
    }

    db.students.splice(index, 1);

    return res.status(204).end();
}
