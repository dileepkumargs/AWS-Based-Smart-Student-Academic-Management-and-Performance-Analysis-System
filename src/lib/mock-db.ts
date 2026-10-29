import { Student } from "@/types/student";
import { Course } from "@/types/course";
import { Faculty } from "@/types/faculty";
import { Enrollment } from "@/types/enrollment";
import rawData from "../../db.json";

interface DB {
    students: Student[];
    courses: Course[];
    faculty: Faculty[];
    enrollments: Enrollment[];
}

declare global {
    var __db: DB | undefined;
}

// Ensure the mock-db is a singleton across reloads in dev
if (!global.__db) {
    global.__db = structuredClone(rawData) as unknown as DB;
}

export function getDB() {
    return global.__db!;
}

