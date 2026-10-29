import axios from "axios";
import { Student } from "@/types/student";
import { StudentFormData } from "@/lib/validators";

export interface StudentListResponse {
    data: Student[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

export const StudentService = {
    list: async (params: {
        page: number;
        limit: number;
        search?: string;
        year?: number;
        course?: string;
    }): Promise<StudentListResponse> => {
        const res = await axios.get("/api/students", { params });
        return res.data;
    },

    getById: async (id: number): Promise<Student> => {
        const res = await axios.get(`/api/students/${id}`);
        return res.data;
    },

    create: async (data: StudentFormData): Promise<Student> => {
        const res = await axios.post("/api/students", data);
        return res.data;
    },

    update: async (id: number, data: StudentFormData): Promise<Student> => {
        const res = await axios.put(`/api/students/${id}`, data);
        return res.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`/api/students/${id}`);
    }
};
