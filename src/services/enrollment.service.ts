import axios from "axios";
import { Enrollment, EnrollmentWithDetails } from "@/types/enrollment";
import { EnrollmentFormData } from "@/lib/validators";

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

    create: async (data: EnrollmentFormData): Promise<Enrollment> => {
        const res = await axios.post("/api/enrollments", data);
        return res.data;
    },

    update: async (id: number, data: Partial<EnrollmentFormData>): Promise<Enrollment> => {
        const res = await axios.put(`/api/enrollments/${id}`, data);
        return res.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`/api/enrollments/${id}`);
    },

    getByStudent: async (studentId: number): Promise<EnrollmentWithDetails[]> => {
        const res = await axios.get(`/api/enrollments?studentId=${studentId}&limit=1000`);
        return res.data.data;
    },

    getByCourse: async (courseId: number): Promise<EnrollmentWithDetails[]> => {
        const res = await axios.get(`/api/enrollments?courseId=${courseId}&limit=1000`);
        return res.data.data;
    }
};
