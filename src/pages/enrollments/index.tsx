import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import EnrollmentTable from "@/components/tables/EnrollmentTable";
import EnrollmentForm from "@/components/forms/EnrollmentForm";
import { EnrollmentWithDetails } from "@/types/enrollment";
import { Student } from "@/types/student";
import { Course } from "@/types/course";
import { EnrollmentService } from "@/services/enrollment.service";
import { StudentService } from "@/services/student.service";
import { CourseService } from "@/services/course.service";
import { EnrollmentFormData } from "@/lib/validators";
import { exportToCSV } from "@/lib/csv-utils";

export default function EnrollmentsPage() {
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const limit = 10;

    useEffect(() => {
        fetchEnrollments();
        fetchStudentsAndCourses();
    }, [page]);

    async function fetchEnrollments() {
        setLoading(true);
        try {
            const res = await EnrollmentService.list({ page, limit });
            setEnrollments(res.data);
            setTotal(res.meta.total);
        } catch (error) {
            console.error("Failed to fetch enrollments:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchStudentsAndCourses() {
        try {
            const [studentsRes, coursesRes] = await Promise.all([
                StudentService.list({ page: 1, limit: 1000 }),
                CourseService.list({ page: 1, limit: 1000 })
            ]);
            setStudents(studentsRes.data);
            setCourses(coursesRes.data);
        } catch (error) {
            console.error("Failed to fetch students/courses:", error);
        }
    }

    async function handleCreateEnrollment(data: EnrollmentFormData) {
        try {
            await EnrollmentService.create(data);
            toast.success("Student enrolled successfully!");
            setPage(1);
            fetchEnrollments();
        } catch (error) {
            console.error(error);
            toast.error("Failed to enroll student.");
        }
    }

    async function handleDelete(id: number) {
        if (confirm("Are you sure you want to delete this enrollment?")) {
            try {
                await EnrollmentService.delete(id);
                toast.success("Enrollment record deleted.");
                fetchEnrollments();
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete enrollment.");
            }
        }
    }

    async function handleExportCSV() {
        try {
            const res = await EnrollmentService.list({ page: 1, limit: 1000 });
            exportToCSV(res.data, 'enrollments');
        } catch (error) {
            console.error("Failed to export enrollments:", error);
        }
    }

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-3">
                    <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Enrollments
                        </h1>
                        <p className="text-gray-600 mt-1">Manage student course enrollments and grades</p>
                    </div>
                </div>
            </div>

            {/* Enrollment Form */}
            <EnrollmentForm
                onSubmit={handleCreateEnrollment}
                students={students}
                courses={courses}
            />

            {/* Export Button */}
            <div className="mb-6 flex justify-end">
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to CSV
                </button>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex justify-center items-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600"></div>
                </div>
            ) : (
                <>
                    {/* Enrollment Table */}
                    <EnrollmentTable
                        enrollments={enrollments}
                        onDelete={handleDelete}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex justify-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                Previous
                            </button>
                            <span className="px-4 py-2 bg-gray-100 rounded-lg font-medium">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
