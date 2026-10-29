import axios from "axios";
import { Faculty } from "@/types/faculty";
import { FacultyFormData } from "@/lib/validators";

export interface FacultyListResponse {
    data: Faculty[];
    meta: {
        total: number;
        page: number;
        limit: number;
    };
}

export const FacultyService = {
    list: async (params: {
        page: number;
        limit: number;
        search?: string;
        department?: string;
    }): Promise<FacultyListResponse> => {
        const res = await axios.get("/api/faculty", { params });
        return res.data;
    },

    getById: async (id: number): Promise<Faculty> => {
        const res = await axios.get(`/api/faculty/${id}`);
        return res.data;
    },

    create: async (data: FacultyFormData): Promise<Faculty> => {
        const res = await axios.post("/api/faculty", data);
        return res.data;
    },

    update: async (id: number, data: FacultyFormData): Promise<Faculty> => {
        const res = await axios.put(`/api/faculty/${id}`, data);
        return res.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`/api/faculty/${id}`);
    }
};
