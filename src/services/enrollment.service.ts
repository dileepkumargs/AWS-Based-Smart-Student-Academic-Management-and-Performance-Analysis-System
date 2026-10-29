import axios from "axios";
import { Enrollment, EnrollmentWithDetails } from "@/types/enrollment";
import { EnrollmentFormData, FacultyEnrollmentCreateData, FacultyEnrollmentUpdateData } from "@/lib/validators";

async function listAll(params: { studentId?: number; courseId?: number }): Promise<EnrollmentWithDetails[]> {
    const firstPage = await EnrollmentService.list({ ...params, page: 1, limit: 100 });
    const pageCount = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
    if (pageCount <= 1) return firstPage.data;
    const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) =>
            EnrollmentService.list({ ...params, page: index + 2, limit: 100 })
        )
    );
    return firstPage.data.concat(...remainingPages.map(result => result.data));
}

export interface EnrollmentListResponse {
    data: EnrollmentWithDetails[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

export const EnrollmentService = {
    list: async (params: {
        page: number;
        limit: number;
        studentId?: number;
        courseId?: number;
    }): Promise<EnrollmentListResponse> => {
        const res = await axios.get("/api/enrollments", { params });
        return res.data;
    },

    getById: async (id: number): Promise<EnrollmentWithDetails> => {
        const res = await axios.get(`/api/enrollments/${id}`);
        return res.data;
    },

    create: async (data: EnrollmentFormData | FacultyEnrollmentCreateData): Promise<Enrollment> => {
        const res = await axios.post("/api/enrollments", data);
        return res.data;
    },

    update: async (id: number, data: Partial<EnrollmentFormData> | FacultyEnrollmentUpdateData): Promise<Enrollment> => {
        const res = await axios.put(`/api/enrollments/${id}`, data);
        return res.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`/api/enrollments/${id}`);
    },

    getByStudent: async (studentId: number): Promise<EnrollmentWithDetails[]> => {
        return listAll({ studentId });
    },

    getByCourse: async (courseId: number): Promise<EnrollmentWithDetails[]> => {
        return listAll({ courseId });
    }
};
