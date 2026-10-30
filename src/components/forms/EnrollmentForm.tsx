import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { enrollmentSchema, EnrollmentFormData } from "@/lib/validators";
import { Student } from "@/types/student";
import { Course } from "@/types/course";

interface Props {
    onSubmit: (data: EnrollmentFormData) => Promise<boolean>;
    students: Student[];
    courses: Course[];
    initialData?: Partial<EnrollmentFormData>;
}

const fieldClassName = "h-10 w-full rounded-lg border border-purple-300 bg-white px-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200";
const labelClassName = "mb-1 block text-xs font-semibold text-gray-700";

export default function EnrollmentForm({ onSubmit, students, courses, initialData }: Props) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset
    } = useForm<EnrollmentFormData>({
        resolver: zodResolver(enrollmentSchema),
        defaultValues: initialData || {
            enrolledDate: new Date().toISOString().split('T')[0],
            status: 'enrolled',
            semester: 'Spring',
            year: new Date().getFullYear()
        }
    });

    const onSubmitHandler = async (data: EnrollmentFormData) => {
        const saved = await onSubmit(data);
        if (saved && !initialData) {
            reset({
                enrolledDate: new Date().toISOString().slice(0, 10),
                status: "enrolled",
                semester: "Spring",
                year: new Date().getFullYear()
            });
        }
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmitHandler)}
            className="mb-5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 shadow-lg sm:p-5"
        >
            <div className="mb-4 flex items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 p-2 shadow-md">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>
                <h2 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-xl font-bold text-transparent">
                    {initialData ? "Update Enrollment" : "New Enrollment"}
                </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className={labelClassName} htmlFor="enrollment-student">Student</label>
                    <select id="enrollment-student" {...register("studentId", { valueAsNumber: true })} className={fieldClassName}>
                        <option value="">Select a student</option>
                        {students.map(student => (
                            <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                    </select>
                    {errors.studentId && <p className="mt-1 text-xs text-red-600">{errors.studentId.message}</p>}
                </div>

                <div>
                    <label className={labelClassName} htmlFor="enrollment-course">Course</label>
                    <select id="enrollment-course" {...register("courseId", { valueAsNumber: true })} className={fieldClassName}>
                        <option value="">Select a course</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        ))}
                    </select>
                    {errors.courseId && <p className="mt-1 text-xs text-red-600">{errors.courseId.message}</p>}
                </div>

                <div>
                    <label className={labelClassName} htmlFor="enrollment-semester">Semester</label>
                    <select id="enrollment-semester" {...register("semester")} className={fieldClassName}>
                        <option value="Spring">Spring</option>
                        <option value="Fall">Fall</option>
                        <option value="Summer">Summer</option>
                    </select>
                    {errors.semester && <p className="mt-1 text-xs text-red-600">{errors.semester.message}</p>}
                </div>

                <div>
                    <label className={labelClassName} htmlFor="enrollment-year">Academic Year</label>
                    <input id="enrollment-year" type="number" {...register("year", { valueAsNumber: true })} className={fieldClassName} />
                    {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>}
                </div>

                <div>
                    <label className={labelClassName} htmlFor="enrollment-grade">Grade (Optional)</label>
                    <select id="enrollment-grade" {...register("grade")} className={fieldClassName}>
                        <option value="">Not graded yet</option>
                        {["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"].map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                        ))}
                    </select>
                    {errors.grade && <p className="mt-1 text-xs text-red-600">{errors.grade.message}</p>}
                </div>

                <div>
                    <label className={labelClassName} htmlFor="enrollment-status">Status</label>
                    <select id="enrollment-status" {...register("status")} className={fieldClassName}>
                        <option value="enrolled">Enrolled</option>
                        <option value="completed">Completed</option>
                        <option value="dropped">Dropped</option>
                    </select>
                    {errors.status && <p className="mt-1 text-xs text-red-600">{errors.status.message}</p>}
                </div>

                <div>
                    <label className={labelClassName} htmlFor="enrollment-date">Enrolled Date</label>
                    <input id="enrollment-date" type="date" {...register("enrolledDate")} className={fieldClassName} />
                    {errors.enrolledDate && <p className="mt-1 text-xs text-red-600">{errors.enrolledDate.message}</p>}
                </div>

                <div className="flex items-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 text-sm font-semibold text-white shadow-md transition-colors hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                Processing...
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {initialData ? "Update Enrollment" : "Create Enrollment"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}
