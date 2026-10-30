export interface Enrollment {
    id: number;
    studentId: number;
    courseId: number | null;
    branch: string;
    studyYear: number | null;
    grade?: string; // A, B, C, D, F or pending
    semester: string;
    year: number;
    status: 'enrolled' | 'completed' | 'dropped';
    enrolledDate: string;
}

// Extended type with populated student and course info
export interface EnrollmentWithDetails extends Enrollment {
    studentName?: string;
    studentEmail?: string | null;
    studentYear?: number;
    courseName?: string;
    courseCode?: string;
    courseBranch?: string | null;
    courseDepartment?: string;
    courseFacultyId?: number | null;
    createdByCurrentUser?: boolean;
}
