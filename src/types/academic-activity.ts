export type AttendanceStatus = "present" | "absent" | "late";
export type AnnouncementCategory = "general_notice" | "examination_schedule" | "assignment" | "important_notice";
export type TimetableType = "class" | "examination";
export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface AttendanceRecord {
    id?: number;
    enrollmentId: number;
    studentId: number;
    studentName: string;
    studentEmail: string | null;
    courseId: number;
    courseCode: string;
    courseName: string;
    semester: string;
    year: number;
    status: AttendanceStatus | null;
    attendanceDate: string | null;
    attendanceCount?: number;
    attendedCount?: number;
    attendancePercentage?: number;
}

export interface AttendanceSummary {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
}

export interface Announcement {
    id: number;
    courseId: number;
    courseCode: string;
    courseName: string;
    title: string;
    description: string;
    category: AnnouncementCategory;
    publicationDate: string;
    expiryDate: string | null;
    isPinned: boolean;
    createdBy: number;
    createdAt: string;
}

export interface TimetableEntry {
    id: number;
    courseId: number;
    courseCode: string;
    courseName: string;
    facultyId: number;
    facultyName: string;
    semester: string;
    year: number;
    scheduleType: TimetableType;
    dayOfWeek: Weekday | null;
    eventDate: string | null;
    title: string | null;
    startTime: string;
    endTime: string;
    location: string;
}
