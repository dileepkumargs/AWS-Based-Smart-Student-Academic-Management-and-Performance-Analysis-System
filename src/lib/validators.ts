import { z } from "zod";

// Student Schema
export const studentSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    year: z.number().int("Year must be an integer"),
    course: z.string().min(2, "Course must be at least 2 characters"),
    gpa: z.number().min(0, "GPA must be at least 0").max(4, "GPA must be at most 4")
});

export type StudentFormData = z.infer<typeof studentSchema>;

// For backward compatibility with API
export const createStudentSchema = studentSchema;

// Course Schema
export const courseSchema = z.object({
    code: z.string().min(2, "Course code must be at least 2 characters"),
    name: z.string().min(3, "Course name must be at least 3 characters"),
    credits: z.number().int("Credits must be an integer").min(1).max(6),
    department: z.string().min(2, "Department must be at least 2 characters"),
    instructor: z.string().optional()
});

export type CourseFormData = z.infer<typeof courseSchema>;

export const facultyCourseUpdateSchema = courseSchema.pick({
    name: true,
    department: true
});

export type FacultyCourseUpdateData = z.infer<typeof facultyCourseUpdateSchema>;

// Faculty Schema
export const facultySchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    department: z.string().min(2, "Department must be at least 2 characters"),
    specialization: z.string().min(2, "Specialization must be at least 2 characters"),
    phone: z.string().optional()
});

export type FacultyFormData = z.infer<typeof facultySchema>;

// Enrollment Schema
export const enrollmentSchema = z.object({
    studentId: z.number().int().positive("Student ID must be a positive integer"),
    courseId: z.number().int().positive("Course ID must be a positive integer"),
    grade: z.string().max(8).nullable().optional(),
    semester: z.string().trim().min(1, "Semester is required").max(32),
    year: z.number().int().min(1900).max(2200),
    status: z.enum(['enrolled', 'completed', 'dropped']),
    enrolledDate: z.iso.date("Enter a valid enrollment date.")
});

export type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export const facultyEnrollmentCreateSchema = enrollmentSchema.pick({
    studentId: true,
    courseId: true,
    semester: true,
    year: true,
    enrolledDate: true
});

export type FacultyEnrollmentCreateData = z.infer<typeof facultyEnrollmentCreateSchema>;

export const facultyEnrollmentUpdateSchema = z.object({
    grade: z.string().max(8).nullable().optional(),
    status: z.enum(["enrolled", "completed", "dropped"]).optional()
}).strict();

export type FacultyEnrollmentUpdateData = z.infer<typeof facultyEnrollmentUpdateSchema>;
