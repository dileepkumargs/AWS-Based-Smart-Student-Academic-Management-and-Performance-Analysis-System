export interface Student {
    id: number;
    name: string;
    year: number;
    course: string;
    courseId?: number | null;
    gpa: number;
    email?: string | null;
    accountStatus?: "Active" | "Inactive" | "No account";
}
