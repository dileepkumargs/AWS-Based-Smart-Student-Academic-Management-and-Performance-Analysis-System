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

export const facultyEnrollmentUpdateSchema = z.object({
    grade: z.string().max(8).nullable().optional(),
    status: z.enum(["enrolled", "completed", "dropped"]).optional()
}).strict();

export type FacultyEnrollmentUpdateData = z.infer<typeof facultyEnrollmentUpdateSchema>;

export const attendanceStatusSchema = z.enum(["present", "absent", "late"]);

export const attendanceMarkSchema = z.object({
    courseId: z.number().int().positive(),
    semester: z.string().trim().min(1).max(32),
    year: z.number().int().min(1900).max(2200),
    attendanceDate: z.iso.date(),
    records: z.array(z.object({
        studentId: z.number().int().positive(),
        status: attendanceStatusSchema
    }).strict()).min(1).max(500)
}).strict();

export const announcementSchema = z.object({
    courseId: z.number().int().positive(),
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().min(1).max(10000),
    category: z.enum(["general_notice", "examination_schedule", "assignment", "important_notice"]),
    publicationDate: z.iso.date(),
    expiryDate: z.iso.date().nullable(),
    isPinned: z.boolean()
}).strict().refine(
    data => data.expiryDate === null || data.expiryDate >= data.publicationDate,
    { path: ["expiryDate"], message: "Expiry date must be on or after publication date." }
);

export const timetableEntrySchema = z.object({
    courseId: z.number().int().positive(),
    semester: z.string().trim().min(1).max(32),
    year: z.number().int().min(1900).max(2200),
    scheduleType: z.enum(["class", "examination"]),
    dayOfWeek: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]).nullable(),
    eventDate: z.iso.date().nullable(),
    title: z.string().trim().max(180).nullable(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid start time."),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Enter a valid end time."),
    location: z.string().trim().min(1).max(120)
}).strict().refine(
    data => data.scheduleType === "class"
        ? data.dayOfWeek !== null && data.eventDate === null
        : data.dayOfWeek === null && data.eventDate !== null,
    { path: ["scheduleType"], message: "Class schedules require a weekday; examinations require a date." }
).refine(
    data => data.endTime > data.startTime,
    { path: ["endTime"], message: "End time must be after start time." }
);
