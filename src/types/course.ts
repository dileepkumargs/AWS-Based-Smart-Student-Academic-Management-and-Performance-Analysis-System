import type { EnrollmentBranch } from "@/lib/enrollment-options";

export interface Course {
    id: number;
    code: string;
    name: string;
    credits: number;
    department?: string | null;
    branch?: EnrollmentBranch | null;
    instructor?: string;
    facultyId?: number | null;
}
