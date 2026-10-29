import { useCallback, useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import axios from "axios";
import { BookOpen, Search, UserRound } from "lucide-react";
import { CourseService } from "@/services/course.service";
import { EnrollmentService } from "@/services/enrollment.service";
import { StudentService } from "@/services/student.service";
import type { Course } from "@/types/course";
import type { EnrollmentWithDetails } from "@/types/enrollment";
import type { Student } from "@/types/student";
import {
    facultyEnrollmentCreateSchema,
    facultyEnrollmentUpdateSchema,
    type FacultyEnrollmentCreateData,
    type FacultyEnrollmentUpdateData
} from "@/lib/validators";
import { useAuth } from "@/lib/auth-context";

const PAGE_SIZE = 10;
const LOOKUP_PAGE_SIZE = 100;
const GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "D", "F"];

function getErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<{ message?: string }>(error)) {
        return error.response?.data?.message || fallback;
    }
    return fallback;
}

async function loadAllPages<T>(
    fetchPage: (page: number) => Promise<{ data: T[]; meta: { total: number } }>
) {
    const first = await fetchPage(1);
    const pageCount = Math.ceil(first.meta.total / LOOKUP_PAGE_SIZE);
    if (pageCount <= 1) return first.data;
    const remaining = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 2))
    );
    return first.data.concat(...remaining.map(result => result.data));
}

export default function FacultyEnrollmentManager() {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [studentSearch, setStudentSearch] = useState("");
    const [courseSearch, setCourseSearch] = useState("");
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [loadingEnrollments, setLoadingEnrollments] = useState(true);
    const [optionsError, setOptionsError] = useState("");
    const [enrollmentError, setEnrollmentError] = useState("");
    const [editing, setEditing] = useState<EnrollmentWithDetails | null>(null);

    const assignedCourses = useMemo(
        () => courses.filter(course => course.facultyId === user?.facultyId),
        [courses, user?.facultyId]
    );
    const visibleStudents = useMemo(() => {
        const query = studentSearch.trim().toLowerCase();
        if (!query) return students;
        return students.filter(student =>
            student.name.toLowerCase().includes(query) ||
            String(student.id).includes(query) ||
            (student.email || "").toLowerCase().includes(query)
        );
    }, [studentSearch, students]);
    const visibleCourses = useMemo(() => {
        const query = courseSearch.trim().toLowerCase();
        if (!query) return courses;
        return courses.filter(course =>
            course.name.toLowerCase().includes(query) ||
            course.code.toLowerCase().includes(query) ||
            course.department.toLowerCase().includes(query)
        );
    }, [courseSearch, courses]);

    const createForm = useForm<FacultyEnrollmentCreateData>({
        resolver: zodResolver(facultyEnrollmentCreateSchema),
        defaultValues: {
            semester: "Spring",
            year: new Date().getFullYear(),
            enrolledDate: new Date().toISOString().slice(0, 10)
        }
    });
    const editForm = useForm<FacultyEnrollmentUpdateData>({
        resolver: zodResolver(facultyEnrollmentUpdateSchema)
    });

    const loadOptions = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const [studentRecords, courseRecords] = await Promise.all([
                loadAllPages(pageNumber => StudentService.list({ page: pageNumber, limit: LOOKUP_PAGE_SIZE })),
                loadAllPages(pageNumber => CourseService.list({ page: pageNumber, limit: LOOKUP_PAGE_SIZE }))
            ]);
            setStudents(studentRecords);
            setCourses(courseRecords);
            setOptionsError("");
        } catch (error) {
            console.error("Failed to load student and course enrollment options:", error);
            setOptionsError("Students and courses could not be loaded. Please retry.");
        } finally {
            setLoadingOptions(false);
        }
    }, []);

    const loadEnrollments = useCallback(async () => {
        setLoadingEnrollments(true);
        try {
            const result = await EnrollmentService.list({ page, limit: PAGE_SIZE });
            setEnrollments(result.data);
            setTotal(result.meta.total);
            setEnrollmentError("");
        } catch (error) {
            console.error("Failed to load faculty enrollments:", error);
            setEnrollmentError("Enrollment records could not be loaded. Please retry.");
        } finally {
            setLoadingEnrollments(false);
        }
    }, [page]);

    useEffect(() => {
        // This request synchronizes the selector options with the current database records.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadOptions();
    }, [loadOptions]);

    useEffect(() => {
        // This request synchronizes the table with the current database records.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadEnrollments();
    }, [loadEnrollments]);

    async function createEnrollment(data: FacultyEnrollmentCreateData) {
        try {
            await EnrollmentService.create(data);
        } catch (error) {
            toast.error(getErrorMessage(error, "Unable to enroll this student."));
            return;
        }
        toast.success("Student enrolled successfully.");
        createForm.reset({
            semester: "Spring",
            year: new Date().getFullYear(),
            enrolledDate: new Date().toISOString().slice(0, 10)
        });
        setPage(1);
        await loadEnrollments();
    }

    function openEditor(enrollment: EnrollmentWithDetails) {
        setEditing(enrollment);
        editForm.reset({
            grade: enrollment.grade || "",
            status: enrollment.status
        });
    }

    async function updateEnrollment(data: FacultyEnrollmentUpdateData) {
        if (!editing) return;
        try {
            await EnrollmentService.update(editing.id, data);
        } catch (error) {
            toast.error(getErrorMessage(error, "Unable to update this enrollment."));
            return;
        }
        toast.success("Enrollment updated successfully.");
        setEditing(null);
        await loadEnrollments();
    }

    async function cancelEnrollment(enrollment: EnrollmentWithDetails) {
        if (enrollment.status !== "enrolled") return;
        if (!window.confirm(`Cancel ${enrollment.studentName}'s enrollment in ${enrollment.courseCode}?`)) return;
        try {
            await EnrollmentService.update(enrollment.id, { status: "dropped" });
            toast.success("Enrollment cancelled.");
            await loadEnrollments();
        } catch (error) {
            toast.error(getErrorMessage(error, "Unable to cancel this enrollment."));
        }
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <main className="mx-auto max-w-7xl space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Faculty Workspace</p>
                <h1 className="mt-2 text-4xl font-black text-slate-900">Student Course Enrollment</h1>
                <p className="mt-2 max-w-3xl text-slate-600">Enroll students in courses assigned to your faculty profile, review existing enrollments, and manage enrollment status.</p>
            </header>

            {optionsError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                    <p role="alert">{optionsError}</p>
                    <button type="button" onClick={() => void loadOptions()} className="mt-2 font-bold underline">Retry</button>
                </div>
            )}

            {!loadingOptions && assignedCourses.length === 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    No courses are assigned to your faculty profile yet. Ask a Super Admin to assign courses in the course catalog before enrolling students.
                </div>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                    <span className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><BookOpen aria-hidden="true" /></span>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-900">Enroll a student</h2>
                        <p className="text-sm text-slate-500">The student and course are linked by their existing database IDs.</p>
                    </div>
                </div>

                {loadingOptions ? (
                    <p className="py-6 text-sm text-slate-500" role="status">Loading students and courses...</p>
                ) : (
                    <form onSubmit={createForm.handleSubmit(createEnrollment)} className="grid gap-5 md:grid-cols-2">
                        <label className="text-sm font-bold text-slate-700">
                            Find student
                            <span className="relative mt-2 block">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    value={studentSearch}
                                    onChange={event => setStudentSearch(event.target.value)}
                                    placeholder="Search name, ID, or email"
                                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                                />
                            </span>
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                            Student
                            <select
                                {...createForm.register("studentId", { valueAsNumber: true })}
                                defaultValue=""
                                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                            >
                                <option value="" disabled>Select a student</option>
                                {visibleStudents.map(student => (
                                    <option key={student.id} value={student.id}>
                                        #{student.id} — {student.name}{student.email ? ` (${student.email})` : ""}
                                    </option>
                                ))}
                            </select>
                            {createForm.formState.errors.studentId && <span className="mt-1 block text-xs font-medium text-rose-700">{createForm.formState.errors.studentId.message}</span>}
                        </label>

                        <label className="text-sm font-bold text-slate-700">
                            Find course
                            <span className="relative mt-2 block">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input
                                    value={courseSearch}
                                    onChange={event => setCourseSearch(event.target.value)}
                                    placeholder="Search code, name, or department"
                                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                                />
                            </span>
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                            Course
                            <select
                                {...createForm.register("courseId", { valueAsNumber: true })}
                                defaultValue=""
                                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                            >
                                <option value="" disabled>Select an assigned course</option>
                                {visibleCourses.map(course => (
                                    <option key={course.id} value={course.id} disabled={course.facultyId !== user?.facultyId}>
                                        {course.code} — {course.name} ({course.department}){course.facultyId === user?.facultyId ? "" : " — not assigned to you"}
                                    </option>
                                ))}
                            </select>
                            {createForm.formState.errors.courseId && <span className="mt-1 block text-xs font-medium text-rose-700">{createForm.formState.errors.courseId.message}</span>}
                        </label>

                        <label className="text-sm font-bold text-slate-700">
                            Semester
                            <select {...createForm.register("semester")} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100">
                                <option value="Spring">Spring</option>
                                <option value="Summer">Summer</option>
                                <option value="Fall">Fall</option>
                            </select>
                            {createForm.formState.errors.semester && <span className="mt-1 block text-xs font-medium text-rose-700">{createForm.formState.errors.semester.message}</span>}
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                            Academic year
                            <input
                                type="number"
                                min={1900}
                                max={2200}
                                {...createForm.register("year", { valueAsNumber: true })}
                                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                            />
                            {createForm.formState.errors.year && <span className="mt-1 block text-xs font-medium text-rose-700">{createForm.formState.errors.year.message}</span>}
                        </label>
                        <label className="text-sm font-bold text-slate-700">
                            Enrollment date
                            <input
                                type="date"
                                {...createForm.register("enrolledDate")}
                                className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                            />
                            {createForm.formState.errors.enrolledDate && <span className="mt-1 block text-xs font-medium text-rose-700">{createForm.formState.errors.enrolledDate.message}</span>}
                        </label>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={createForm.formState.isSubmitting || loadingOptions || assignedCourses.length === 0 || students.length === 0}
                                className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {createForm.formState.isSubmitting ? "Enrolling..." : "Enroll Student"}
                            </button>
                        </div>
                    </form>
                )}
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 p-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Course Enrollments</h2>
                        <p className="mt-1 text-sm text-slate-500">Records for courses assigned to your faculty profile.</p>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{total} records</p>
                </div>
                {loadingEnrollments ? (
                    <p className="p-10 text-center text-sm font-semibold text-slate-500" role="status">Loading enrollments...</p>
                ) : enrollmentError ? (
                    <div className="p-8 text-center">
                        <p role="alert" className="text-sm font-medium text-rose-700">{enrollmentError}</p>
                        <button type="button" onClick={() => void loadEnrollments()} className="mt-3 text-sm font-bold text-emerald-700 hover:underline">Retry</button>
                    </div>
                ) : enrollments.length === 0 ? (
                    <div className="p-10 text-center">
                        <UserRound className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
                        <p className="mt-3 text-sm text-slate-500">No course enrollments are available yet.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">Course</th>
                                    <th className="px-5 py-3">Term</th>
                                    <th className="px-5 py-3">Enrollment date</th>
                                    <th className="px-5 py-3">Grade</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {enrollments.map(enrollment => (
                                    <tr key={enrollment.id} className="hover:bg-slate-50/70">
                                        <td className="px-5 py-4">
                                            <span className="block font-semibold text-slate-900">{enrollment.studentName || `Student #${enrollment.studentId}`}</span>
                                            <span className="block text-xs text-slate-500">#{enrollment.studentId}{enrollment.studentEmail ? ` · ${enrollment.studentEmail}` : ""}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="block font-semibold text-slate-900">{enrollment.courseCode}</span>
                                            <span className="block text-xs text-slate-500">{enrollment.courseName}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{enrollment.semester} {enrollment.year}</td>
                                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{enrollment.enrolledDate}</td>
                                        <td className="px-5 py-4 font-semibold text-slate-700">{enrollment.grade || "Pending"}</td>
                                        <td className="px-5 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${enrollment.status === "enrolled" ? "bg-blue-50 text-blue-800" : enrollment.status === "completed" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                                                {enrollment.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-right">
                                            <button type="button" onClick={() => openEditor(enrollment)} className="rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">Update</button>
                                            {enrollment.status === "enrolled" && (
                                                <button type="button" onClick={() => void cancelEnrollment(enrollment)} className="ml-1 rounded-lg px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50">Cancel</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loadingEnrollments && !enrollmentError && totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                        <span className="text-xs font-semibold text-slate-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <button type="button" disabled={page <= 1} onClick={() => { setLoadingEnrollments(true); setPage(value => value - 1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">Previous</button>
                            <button type="button" disabled={page >= totalPages} onClick={() => { setLoadingEnrollments(true); setPage(value => value + 1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">Next</button>
                        </div>
                    </div>
                )}
            </section>

            {editing && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
                    <section role="dialog" aria-modal="true" aria-labelledby="edit-enrollment-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 id="edit-enrollment-title" className="text-xl font-black text-slate-900">Update enrollment</h2>
                        <p className="mt-1 text-sm text-slate-500">{editing.studentName} · {editing.courseCode} · {editing.semester} {editing.year}</p>
                        <form onSubmit={editForm.handleSubmit(updateEnrollment)} className="mt-6 space-y-4">
                            <label className="block text-sm font-bold text-slate-700">
                                Grade
                                <select {...editForm.register("grade")} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
                                    <option value="">Not graded</option>
                                    {GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                                </select>
                            </label>
                            <label className="block text-sm font-bold text-slate-700">
                                Status
                                <select {...editForm.register("status")} disabled={editing.status !== "enrolled"} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100">
                                    <option value="enrolled">Enrolled</option>
                                    <option value="completed">Completed</option>
                                    <option value="dropped">Dropped / cancelled</option>
                                </select>
                                {editing.status !== "enrolled" && <span className="mt-1 block text-xs font-normal text-slate-500">Completed or cancelled enrollments cannot be reopened by faculty.</span>}
                            </label>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>
                                <button type="submit" disabled={editForm.formState.isSubmitting} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{editForm.formState.isSubmitting ? "Saving..." : "Save changes"}</button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}
