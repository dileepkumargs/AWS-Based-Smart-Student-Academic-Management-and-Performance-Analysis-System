import axios from "axios";
import type {
    Announcement,
    AttendanceRecord,
    AttendanceSummary,
    AttendanceStatus,
    TimetableEntry
} from "@/types/academic-activity";
import type { Course } from "@/types/course";

interface PageResult<T> {
    data: T[];
    meta: { total: number; page: number; limit: number };
}

async function loadAllPages<T>(loadPage: (page: number) => Promise<PageResult<T>>): Promise<T[]> {
    const firstPage = await loadPage(1);
    const pageCount = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
    if (pageCount <= 1) return firstPage.data;
    const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) => loadPage(index + 2))
    );
    return firstPage.data.concat(...remainingPages.map(page => page.data));
}

export interface AttendanceResult extends PageResult<AttendanceRecord> {
    summary: AttendanceSummary;
}

export interface AttendanceQuery {
    page: number;
    limit: number;
    mode?: "report" | "roster";
    courseId?: number;
    semester?: string;
    year?: number;
    date?: string;
    period?: "daily" | "weekly" | "monthly";
    search?: string;
    status?: AttendanceStatus;
    studentId?: number;
}

export interface AttendanceSubmission {
    courseId: number;
    semester: string;
    year: number;
    attendanceDate: string;
    records: { studentId: number; status: AttendanceStatus }[];
}

export interface AnnouncementInput {
    courseId: number;
    title: string;
    description: string;
    category: Announcement["category"];
    publicationDate: string;
    expiryDate: string | null;
    isPinned: boolean;
}

export type TimetableInput = Omit<TimetableEntry,
    "id" | "courseCode" | "courseName" | "facultyId" | "facultyName">;

export const AcademicActivityService = {
    attendance: async (params: AttendanceQuery): Promise<AttendanceResult> => {
        const { data } = await axios.get("/api/attendance", { params });
        return data;
    },
    allAttendance: async (params: Omit<AttendanceQuery, "page" | "limit">): Promise<AttendanceResult> => {
        const firstPage = await AcademicActivityService.attendance({ ...params, page: 1, limit: 100 });
        const pageCount = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
        if (pageCount <= 1) return firstPage;
        const remainingPages = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
                AcademicActivityService.attendance({ ...params, page: index + 2, limit: 100 })
            )
        );
        return { ...firstPage, data: firstPage.data.concat(...remainingPages.map(page => page.data)) };
    },
    markAttendance: async (data: AttendanceSubmission): Promise<{ saved: number }> => {
        const response = await axios.post("/api/attendance", data);
        return response.data;
    },
    announcements: async (params: { page: number; limit: number; courseId?: number; category?: string; search?: string; studentId?: number }): Promise<PageResult<Announcement>> => {
        const { data } = await axios.get("/api/announcements", { params });
        return data;
    },
    allAnnouncements: async (params: { courseId?: number; category?: string; search?: string; studentId?: number } = {}): Promise<Announcement[]> =>
        loadAllPages(page => AcademicActivityService.announcements({ ...params, page, limit: 100 })),
    createAnnouncement: async (input: AnnouncementInput): Promise<Announcement> => {
        const { data } = await axios.post("/api/announcements", input);
        return data;
    },
    updateAnnouncement: async (id: number, input: AnnouncementInput): Promise<Announcement> => {
        const { data } = await axios.put(`/api/announcements/${id}`, input);
        return data;
    },
    deleteAnnouncement: async (id: number): Promise<void> => {
        await axios.delete(`/api/announcements/${id}`);
    },
    timetable: async (params: { page: number; limit: number; courseId?: number; semester?: string; year?: number; upcomingExams?: boolean; studentId?: number }): Promise<PageResult<TimetableEntry>> => {
        const { data } = await axios.get("/api/timetable", { params });
        return data;
    },
    allTimetable: async (params: { courseId?: number; semester?: string; year?: number; upcomingExams?: boolean; studentId?: number } = {}): Promise<TimetableEntry[]> =>
        loadAllPages(page => AcademicActivityService.timetable({ ...params, page, limit: 100 })),
    createTimetableEntry: async (input: TimetableInput): Promise<TimetableEntry> => {
        const { data } = await axios.post("/api/timetable", input);
        return data;
    },
    updateTimetableEntry: async (id: number, input: TimetableInput): Promise<TimetableEntry> => {
        const { data } = await axios.put(`/api/timetable/${id}`, input);
        return data;
    },
    deleteTimetableEntry: async (id: number): Promise<void> => {
        await axios.delete(`/api/timetable/${id}`);
    },
    courseOptions: async (): Promise<Course[]> => {
        const { data } = await axios.get("/api/courses", { params: { page: 1, limit: 100 } });
        const courses: Course[] = data.data;
        const pageCount = Math.ceil(data.meta.total / data.meta.limit);
        if (pageCount <= 1) return courses;
        const pages = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
                axios.get("/api/courses", { params: { page: index + 2, limit: 100 } })
            )
        );
        return courses.concat(...pages.map(response => response.data.data as Course[]));
    }
};
