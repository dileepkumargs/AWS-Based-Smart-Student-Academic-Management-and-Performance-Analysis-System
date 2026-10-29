export interface Course {
    id: number;
    code: string;
    name: string;
    credits: number;
    department: string;
    instructor?: string;
}
