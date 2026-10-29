import axios from "axios";
import { Course } from "@/types/course";
import { CourseFormData } from "@/lib/validators";

export interface CourseListResponse {
    data: Course[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

export const CourseService = {
    list: async (params: {
        page: number;
        limit: number;
        search?: string;
        department?: string;
        credits?: number;
    }): Promise<CourseListResponse> => {
        const res = await axios.get("/api/courses", { params });
        return res.data;
    },

    getById: async (id: number): Promise<Course> => {
        const res = await axios.get(`/api/courses/${id}`);
        return res.data;
    },

    create: async (data: CourseFormData): Promise<Course> => {
        const res = await axios.post("/api/courses", data);
        return res.data;
    },

    update: async (id: number, data: CourseFormData): Promise<Course> => {
        const res = await axios.put(`/api/courses/${id}`, data);
        return res.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`/api/courses/${id}`);
    }
};
