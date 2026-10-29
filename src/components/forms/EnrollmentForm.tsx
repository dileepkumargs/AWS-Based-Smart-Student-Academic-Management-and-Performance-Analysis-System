import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { enrollmentSchema, EnrollmentFormData } from "@/lib/validators";
import { Student } from "@/types/student";
import { Course } from "@/types/course";

interface Props {
    onSubmit: (data: EnrollmentFormData) => Promise<void>;
    students: Student[];
    courses: Course[];
    initialData?: Partial<EnrollmentFormData>;
}

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
            year: 2025
        }
    });

    const onSubmitHandler = async (data: EnrollmentFormData) => {
        await onSubmit(data);
        if (!initialData) reset();
    };

    return (
        <form onSubmit={handleSubmit(onSubmitHandler)} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-xl border-2 border-purple-200 p-8 mb-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {initialData ? 'Update Enrollment' : 'New Enrollment'}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Selection */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Student
                    </label>
                    <select
                        {...register("studentId", { valueAsNumber: true })}
                        className="w-full border-2 border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-200"
                    >
                        <option value="">Select a student</option>
                        {students.map(student => (
                            <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                    </select>
                    {errors.studentId && <p className="text-red-600 text-sm mt-1">{errors.studentId.message}</p>}
                </div>

                {/* Course Selection */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        Course
                    </label>
                    <select
                        {...register("courseId", { valueAsNumber: true })}
                        className="w-full border-2 border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-200"
                    >
                        <option value="">Select a course</option>
                        {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
                        ))}
                    </select>
                    {errors.courseId && <p className="text-red-600 text-sm mt-1">{errors.courseId.message}</p>}
                </div>

                {/* Semester */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Semester
                    </label>
                    <select
                        {...register("semester")}
                        className="w-full border-2 border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-200"
                    >
                        <option value="Spring">Spring</option>
                        <option value="Fall">Fall</option>
                        <option value="Summer">Summer</option>
                    </select>
                    {errors.semester && <p className="text-red-600 text-sm mt-1">{errors.semester.message}</p>}
                </div>

                {/* Year */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Year
                    </label>
                    <input
                        type="number"
                        {...register("year", { valueAsNumber: true })}
                        className="w-full border-2 border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-200"
                    />
                    {errors.year && <p className="text-red-600 text-sm mt-1">{errors.year.message}</p>}
                </div>

                {/* Grade */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Grade (Optional)
                    </label>
                    <select
                        {...register("grade")}
                        className="w-full border-2 border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-200"
                    >
                        <option value="">Not graded yet</option>
                        <option value="A">A</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B">B</option>
                        <option value="B-">B-</option>
                        <option value="C+">C+</option>
                        <option value="C">C</option>
                        <option value="C-">C-</option>
                        <option value="D">D</option>
                        <option value="F">F</option>
                    </select>
                    {errors.grade && <p className="text-red-600 text-sm mt-1">{errors.grade.message}</p>}
                </div>

                {/* Status */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Status
                    </label>
                    <select
                        {...register("status")}
                        className="w-full border-2 border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-200"
                    >
                        <option value="enrolled">Enrolled</option>
                        <option value="completed">Completed</option>
                        <option value="dropped">Dropped</option>
                    </select>
                    {errors.status && <p className="text-red-600 text-sm mt-1">{errors.status.message}</p>}
                </div>

                {/* Enrolled Date */}
                <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Enrolled Date
                    </label>
                    <input
                        type="date"
                        {...register("enrolledDate")}
                        className="w-full border-2 border-purple-300 rounded-xl p-3 focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all duration-200"
                    />
                    {errors.enrolledDate && <p className="text-red-600 text-sm mt-1">{errors.enrolledDate.message}</p>}
                </div>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {initialData ? 'Update Enrollment' : 'Create Enrollment'}
                    </>
                )}
            </button>
        </form>
    );
}
