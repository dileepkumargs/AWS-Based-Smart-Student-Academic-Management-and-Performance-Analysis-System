import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "react-hot-toast";
import EnrollmentTable from "@/components/tables/EnrollmentTable";
import EnrollmentForm from "@/components/forms/EnrollmentForm";
import { EnrollmentWithDetails } from "@/types/enrollment";
import { Student } from "@/types/student";
import { EnrollmentService } from "@/services/enrollment.service";
import { StudentService } from "@/services/student.service";
import { EnrollmentFormData } from "@/lib/validators";
import { ENROLLMENT_BRANCHES, ENROLLMENT_STUDY_YEARS, getStudyYearLabel, isEnrollmentBranch } from "@/lib/enrollment-options";
import { exportToCSV } from "@/lib/csv-utils";
import { useAuth } from "@/lib/auth-context";
import axios from "axios";

const LOOKUP_PAGE_SIZE = 100;

async function loadAllPages<T>(
    fetchPage: (page: number) => Promise<{ data: T[]; meta: { total: number; limit: number } }>
): Promise<T[]> {
    const firstPage = await fetchPage(1);
    const pageCount = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
    if (pageCount <= 1) return firstPage.data;

    const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2))
    );
    return firstPage.data.concat(...remainingPages.map(result => result.data));
}

export default function EnrollmentsPage() {
    const { user } = useAuth();
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [enrollmentError, setEnrollmentError] = useState("");
    const [filters, setFilters] = useState({
        search: "",
        branch: "",
        studyYear: "",
        semester: "",
        year: "",
        status: ""
    });
    const [viewingEnrollment, setViewingEnrollment] = useState<EnrollmentWithDetails | null>(null);
    const [editingEnrollment, setEditingEnrollment] = useState<EnrollmentWithDetails | null>(null);
    const [editGrade, setEditGrade] = useState("");
    const [editStatus, setEditStatus] = useState<EnrollmentWithDetails["status"]>("enrolled");

    const limit = 10;

    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await EnrollmentService.list({
                page,
                limit,
                search: filters.search.trim() || undefined,
                branch: filters.branch || undefined,
                studyYear: filters.studyYear ? Number(filters.studyYear) : undefined,
                semester: filters.semester || undefined,
                year: filters.year ? Number(filters.year) : undefined,
                status: filters.status
                    ? filters.status as EnrollmentWithDetails["status"]
                    : undefined
            });
            setEnrollments(res.data);
            setTotal(res.meta.total);
            setEnrollmentError("");
        } catch (error) {
            console.error("Failed to fetch enrollments:", error);
            setEnrollmentError("Enrollment records could not be loaded. Please retry.");
        } finally {
            setLoading(false);
        }
    }, [filters, limit, page]);

    const fetchStudents = useCallback(async () => {
        try {
            setStudents(await loadAllPages(
                pageNumber => StudentService.list({ page: pageNumber, limit: LOOKUP_PAGE_SIZE })
            ));
        } catch (error) {
            console.error("Failed to fetch students:", error);
        }
    }, []);

    async function handleCreateEnrollment(data: EnrollmentFormData): Promise<boolean> {
        try {
            await EnrollmentService.create(data);
            toast.success("Student enrolled successfully!");
            if (page !== 1) {
                setPage(1);
            } else {
                await fetchEnrollments();
            }
            return true;
        } catch (error) {
            console.error(error);
            const responseData = axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)
                ? error.response?.data
                : undefined;
            const fieldErrors = responseData?.errors
                ? Object.entries(responseData.errors)
                    .flatMap(([field, messages]) => messages.map(message => `${field}: ${message}`))
                    .join("; ")
                : "";
            toast.error(fieldErrors || responseData?.message || "Failed to enroll student.");
            return false;
        }
    }

    useEffect(() => {
        // Fetching data synchronizes this view with the persisted enrollment records.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchEnrollments();
    }, [fetchEnrollments]);

    useEffect(() => {
        // Fetching data synchronizes the form options with current database records.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchStudents();
    }, [fetchStudents]);

    async function handleDelete(id: number) {
        if (confirm("Are you sure you want to delete this enrollment?")) {
            try {
                await EnrollmentService.delete(id);
                toast.success("Enrollment record deleted.");
                await fetchEnrollments();
            } catch (error) {
                console.error(error);
                toast.error("Failed to delete enrollment.");
            }
        }
    }

    function canEditEnrollment(enrollment: EnrollmentWithDetails) {
        return user?.role === "SUPER_ADMIN" ||
            (user?.role === "FACULTY" && user.facultyId !== null &&
                (enrollment.courseFacultyId === user.facultyId || enrollment.createdByCurrentUser === true));
    }

    function openEnrollmentEditor(enrollment: EnrollmentWithDetails) {
        if (!canEditEnrollment(enrollment)) return;
        setEditingEnrollment(enrollment);
        setEditGrade(enrollment.grade || "");
        setEditStatus(enrollment.status);
    }

    async function handleAdminEnrollmentUpdate(data: EnrollmentFormData): Promise<boolean> {
        if (!editingEnrollment || user?.role !== "SUPER_ADMIN") return false;
        try {
            await EnrollmentService.update(editingEnrollment.id, data);
            toast.success("Enrollment updated successfully.");
            setEditingEnrollment(null);
            await fetchEnrollments();
            return true;
        } catch (error) {
            console.error("Failed to update enrollment:", error);
            const responseData = axios.isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)
                ? error.response?.data
                : undefined;
            toast.error(responseData?.message || "Failed to update enrollment.");
            return false;
        }
    }

    async function handleFacultyEnrollmentUpdate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editingEnrollment || user?.role !== "FACULTY" || !canEditEnrollment(editingEnrollment)) return;
        try {
            await EnrollmentService.update(editingEnrollment.id, {
                grade: editGrade || null,
                status: editStatus
            });
            toast.success("Enrollment updated successfully.");
            setEditingEnrollment(null);
            await fetchEnrollments();
        } catch (error) {
            console.error("Failed to update enrollment:", error);
            const responseData = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data
                : undefined;
            toast.error(responseData?.message || "Failed to update enrollment.");
        }
    }

    function updateFilters(values: Partial<typeof filters>) {
        setPage(1);
        setFilters(current => ({ ...current, ...values }));
    }

    async function handleExportCSV() {
        try {
            const res = await EnrollmentService.list({ page: 1, limit: 1000 });
            exportToCSV(res.data.map(enrollment => ({
                studentName: enrollment.studentName || `Student #${enrollment.studentId}`,
                studentId: enrollment.studentId,
                branch: enrollment.branch,
                studyYear: enrollment.studyYear === null
                    ? "Not recorded"
                    : getStudyYearLabel(enrollment.studyYear),
                studentEmail: enrollment.studentEmail || "Not available",
                semester: enrollment.semester,
                academicYear: enrollment.year,
                grade: enrollment.grade || "Not graded",
                status: enrollment.status,
                enrolledDate: enrollment.enrolledDate
            })), "enrollments");
        } catch (error) {
            console.error("Failed to export enrollments:", error);
        }
    }

    const totalPages = Math.ceil(total / limit);

    return (
        <main className="min-h-[calc(100vh-3.5rem)] w-full px-3 py-4 sm:px-5 lg:px-6">
            {/* Header */}
            <div className="mb-4">
                <div className="mb-2 flex items-center gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 p-2 shadow-md">
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold text-transparent">
                            Enrollments
                        </h1>
                        <p className="mt-0.5 text-sm text-gray-600">Manage student enrollments and grades</p>
                    </div>
                </div>
            </div>

            {/* Enrollment Form */}
            {user?.role !== "STUDENT" && (
                <EnrollmentForm
                    onSubmit={handleCreateEnrollment}
                    students={students}
                />
            )}

            <section className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm" aria-label="Enrollment filters">
                <h2 className="mb-3 text-base font-bold text-gray-900">Search and filter enrollments</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <label className="text-xs font-semibold text-gray-700">
                        Search student name or ID
                        <input
                            type="search"
                            value={filters.search}
                            onChange={event => updateFilters({ search: event.target.value })}
                            placeholder="Name or Student ID"
                            className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2.5 text-sm font-normal"
                        />
                    </label>
                    <label className="text-xs font-semibold text-gray-700">
                        Branch
                        <select
                            value={filters.branch}
                            onChange={event => {
                                const branch = event.target.value;
                                const selectedYear = Number(filters.studyYear);
                                const availableYears = isEnrollmentBranch(branch)
                                    ? ENROLLMENT_STUDY_YEARS[branch]
                                    : [1, 2, 3, 4];
                                updateFilters({
                                    branch,
                                    studyYear: filters.studyYear && !availableYears.includes(selectedYear)
                                        ? ""
                                        : filters.studyYear
                                });
                            }}
                            className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2.5 text-sm font-normal"
                        >
                            <option value="">All branches</option>
                            {ENROLLMENT_BRANCHES.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-gray-700">
                        Year of study
                        <select
                            value={filters.studyYear}
                            onChange={event => updateFilters({ studyYear: event.target.value })}
                            className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2.5 text-sm font-normal"
                        >
                            <option value="">All years</option>
                            {(isEnrollmentBranch(filters.branch)
                                ? ENROLLMENT_STUDY_YEARS[filters.branch]
                                : [1, 2, 3, 4]).map(year => (
                                <option key={year} value={year}>{getStudyYearLabel(year)}</option>
                            ))}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-gray-700">
                        Semester
                        <input
                            type="search"
                            value={filters.semester}
                            onChange={event => updateFilters({ semester: event.target.value })}
                            placeholder="All semesters"
                            className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2.5 text-sm font-normal"
                        />
                    </label>
                    <label className="text-xs font-semibold text-gray-700">
                        Academic year
                        <input
                            type="number"
                            min="1900"
                            max="2200"
                            value={filters.year}
                            onChange={event => updateFilters({ year: event.target.value })}
                            placeholder="All years"
                            className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2.5 text-sm font-normal"
                        />
                    </label>
                    <label className="text-xs font-semibold text-gray-700">
                        Status
                        <select
                            value={filters.status}
                            onChange={event => updateFilters({ status: event.target.value })}
                            className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-2.5 text-sm font-normal"
                        >
                            <option value="">All statuses</option>
                            <option value="enrolled">Enrolled</option>
                            <option value="completed">Completed</option>
                            <option value="dropped">Dropped</option>
                        </select>
                    </label>
                </div>
            </section>

            {/* Export Button */}
            <div className="mb-3 flex justify-end">
                <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:from-green-700 hover:to-green-800"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export to CSV
                </button>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-10">
                    <div className="h-10 w-10 animate-spin rounded-full border-t-4 border-b-4 border-purple-600"></div>
                </div>
            ) : enrollmentError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800" role="alert">
                    {enrollmentError}
                </div>
            ) : (
                <>
                    {/* Enrollment Table */}
                    <EnrollmentTable
                        enrollments={enrollments}
                        onView={setViewingEnrollment}
                        onEdit={user?.role === "SUPER_ADMIN" || user?.role === "FACULTY"
                            ? openEnrollmentEditor
                            : undefined}
                        canEdit={canEditEnrollment}
                        onDelete={user?.role === "SUPER_ADMIN" ? handleDelete : undefined}
                    />

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex justify-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="rounded-lg bg-purple-600 px-3 py-2 text-sm text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="rounded-lg bg-purple-600 px-3 py-2 text-sm text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {viewingEnrollment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="enrollment-details-title"
                        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-5 flex items-center justify-between gap-4">
                            <h2 id="enrollment-details-title" className="text-2xl font-bold text-gray-900">Enrollment Details</h2>
                            <button type="button" onClick={() => setViewingEnrollment(null)} className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
                                Close
                            </button>
                        </div>
                        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div><dt className="text-sm text-gray-500">Student Name</dt><dd className="font-semibold">{viewingEnrollment.studentName || "Not available"}</dd></div>
                            <div><dt className="text-sm text-gray-500">USN / Student ID</dt><dd className="font-semibold">#{viewingEnrollment.studentId}</dd></div>
                            <div><dt className="text-sm text-gray-500">Branch</dt><dd className="font-semibold">{viewingEnrollment.branch}</dd></div>
                            <div><dt className="text-sm text-gray-500">Year of Study</dt><dd className="font-semibold">
                                {viewingEnrollment.studyYear === null
                                    ? "Not recorded"
                                    : getStudyYearLabel(viewingEnrollment.studyYear)}
                            </dd></div>
                            <div><dt className="text-sm text-gray-500">Email</dt><dd className="font-semibold">{viewingEnrollment.studentEmail || "Not available"}</dd></div>
                            <div><dt className="text-sm text-gray-500">Semester</dt><dd className="font-semibold">{viewingEnrollment.semester}</dd></div>
                            <div><dt className="text-sm text-gray-500">Academic Year</dt><dd className="font-semibold">{viewingEnrollment.year}</dd></div>
                            <div><dt className="text-sm text-gray-500">Grade</dt><dd className="font-semibold">{viewingEnrollment.grade || "Not graded"}</dd></div>
                            <div><dt className="text-sm text-gray-500">Status</dt><dd className="font-semibold capitalize">{viewingEnrollment.status}</dd></div>
                            <div><dt className="text-sm text-gray-500">Enrolled Date</dt><dd className="font-semibold">{viewingEnrollment.enrolledDate}</dd></div>
                        </dl>
                    </section>
                </div>
            )}

            {editingEnrollment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" role="presentation">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-enrollment-title"
                        className="my-auto w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <h2 id="edit-enrollment-title" className="text-2xl font-bold text-gray-900">Edit Enrollment</h2>
                            <button type="button" onClick={() => setEditingEnrollment(null)} className="rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100">
                                Cancel
                            </button>
                        </div>
                        {user?.role === "SUPER_ADMIN" ? (
                            <EnrollmentForm
                                key={editingEnrollment.id}
                                initialData={editingEnrollment}
                                onSubmit={handleAdminEnrollmentUpdate}
                                students={students}
                            />
                        ) : (
                            <form onSubmit={event => void handleFacultyEnrollmentUpdate(event)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="text-sm font-semibold text-gray-700">
                                    Grade
                                    <select
                                        value={editGrade}
                                        onChange={event => setEditGrade(event.target.value)}
                                        className="mt-1 w-full rounded-lg border border-gray-300 p-2.5"
                                    >
                                        <option value="">Not graded</option>
                                        {["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"].map(grade => (
                                            <option key={grade} value={grade}>{grade}</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm font-semibold text-gray-700">
                                    Status
                                    <select
                                        value={editStatus}
                                        onChange={event => setEditStatus(event.target.value as EnrollmentWithDetails["status"])}
                                        disabled={editingEnrollment.status !== "enrolled"}
                                        className="mt-1 w-full rounded-lg border border-gray-300 p-2.5 disabled:bg-gray-100"
                                    >
                                        <option value="enrolled">Enrolled</option>
                                        <option value="completed">Completed</option>
                                        <option value="dropped">Dropped</option>
                                    </select>
                                </label>
                                <div className="sm:col-span-2 flex justify-end">
                                    <button type="submit" className="rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                </div>
            )}
        </main>
    );
}
