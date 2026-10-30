export interface Enrollment {
    id: number;
    studentId: number;
    courseId: number;
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
    courseDepartment?: string;
    courseFacultyId?: number | null;
}
