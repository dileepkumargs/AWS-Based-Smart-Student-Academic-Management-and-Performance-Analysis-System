import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { Search, X } from "lucide-react";
import { CourseService } from "@/services/course.service";
import type { Course } from "@/types/course";
import { facultyCourseUpdateSchema, type FacultyCourseUpdateData } from "@/lib/validators";
import { useAuth } from "@/lib/auth-context";

const PAGE_SIZE = 10;

export default function FacultyCourseDirectory() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [department, setDepartment] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);

    const fetchCourses = useCallback(() => CourseService.list({
        page,
        limit: PAGE_SIZE,
        search,
        department
    }), [department, page, search]);

    useEffect(() => {
        let active = true;
        fetchCourses().then(result => {
            if (!active) return;
            setCourses(result.data);
            setTotal(result.meta.total);
            setError("");
        }).catch(loadError => {
            console.error("Failed to load faculty course catalog:", loadError);
            if (active) setError("Course records could not be loaded. Please try again.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [fetchCourses]);

    const form = useForm<FacultyCourseUpdateData>({
        resolver: zodResolver(facultyCourseUpdateSchema),
        defaultValues: { name: "", department: "" }
    });

    function openEditor(course: Course) {
        setEditingCourse(course);
        form.reset({ name: course.name, department: course.department ?? "" });
    }

    async function saveCourse(data: FacultyCourseUpdateData) {
        if (!editingCourse) return;
        try {
            await CourseService.update(editingCourse.id, data);
        } catch (saveError) {
            console.error("Failed to update faculty course:", saveError);
            toast.error("Course information could not be updated. Please try again.");
            return;
        }

        toast.success("Course information updated.");
        setEditingCourse(null);
        try {
            const result = await fetchCourses();
            setCourses(result.data);
            setTotal(result.meta.total);
        } catch (refreshError) {
            console.error("Course was updated, but the catalog refresh failed:", refreshError);
            toast.error("Course was saved, but the list could not refresh. Try reloading the page.");
        }
    }

    async function retryLoading() {
        setLoading(true);
        setError("");
        try {
            const result = await fetchCourses();
            setCourses(result.data);
            setTotal(result.meta.total);
        } catch (loadError) {
            console.error("Failed to load faculty course catalog:", loadError);
            setError("Course records could not be loaded. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Course Catalog</h2>
                        <p className="mt-1 text-sm text-slate-500">Courses are shared with the Super Admin catalog. You can edit name and department for courses assigned to you.</p>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{total} courses</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <label className="relative block">
                        <span className="sr-only">Search courses by name or code</span>
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={event => {
                                setLoading(true);
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search course name or code"
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </label>
                    <label>
                        <span className="sr-only">Filter courses by department</span>
                        <input
                            value={department}
                            onChange={event => {
                                setLoading(true);
                                setDepartment(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Filter by department"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center text-sm font-semibold text-slate-500" role="status">Loading courses...</div>
            ) : error ? (
                <div className="p-8 text-center">
                    <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>
                    <button type="button" onClick={() => void retryLoading()} className="mt-3 text-sm font-bold text-emerald-700 hover:underline">Retry</button>
                </div>
            ) : courses.length === 0 ? (
                <p className="p-10 text-center text-sm text-slate-500">No courses match the current search or department filter.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-3">Course ID</th>
                                <th className="px-5 py-3">Code</th>
                                <th className="px-5 py-3">Course name</th>
                                <th className="px-5 py-3">Department</th>
                                <th className="px-5 py-3">Branch</th>
                                <th className="px-5 py-3">Credits</th>
                                <th className="px-5 py-3">Assigned faculty</th>
                                <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {courses.map(course => {
                                const canEdit = user?.role === "FACULTY"
                                    && user.facultyId !== null
                                    && course.facultyId === user.facultyId;
                                return (
                                    <tr key={course.id} className="hover:bg-slate-50/70">
                                        <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">#{course.id}</td>
                                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-700">{course.code}</td>
                                        <td className="px-5 py-4 font-semibold text-slate-900">{course.name}</td>
                                        <td className="px-5 py-4 text-slate-600">{course.department}</td>
                                        <td className="px-5 py-4 text-slate-600">{course.branch || "Unassigned"}</td>
                                        <td className="px-5 py-4 text-slate-600">{course.credits}</td>
                                        <td className="px-5 py-4 text-slate-600">{course.instructor || "Unassigned"}</td>
                                        <td className="whitespace-nowrap px-5 py-4 text-right">
                                            {canEdit ? (
                                                <button
                                                    type="button"
                                                    onClick={() => openEditor(course)}
                                                    className="rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                >
                                                    Edit
                                                </button>
                                            ) : (
                                                <span className="text-xs text-slate-400">View only</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && !error && totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                    <span className="text-xs font-semibold text-slate-500">Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            disabled={page <= 1}
                            onClick={() => {
                                setLoading(true);
                                setPage(current => current - 1);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            disabled={page >= totalPages}
                            onClick={() => {
                                setLoading(true);
                                setPage(current => current + 1);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {editingCourse && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-course-title"
                        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 id="edit-course-title" className="text-xl font-black text-slate-900">Edit {editingCourse.code}</h2>
                                <p className="mt-1 text-sm text-slate-500">Course code, credits, and faculty assignment are protected.</p>
                            </div>
                            <button
                                type="button"
                                aria-label="Close edit course form"
                                onClick={() => setEditingCourse(null)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        <form onSubmit={form.handleSubmit(saveCourse)} className="mt-6 space-y-4">
                            <label className="block text-sm font-bold text-slate-700">
                                Course name
                                <input
                                    {...form.register("name")}
                                    maxLength={160}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                                />
                                {form.formState.errors.name && <span className="mt-1 block text-xs font-medium text-rose-700">{form.formState.errors.name.message}</span>}
                            </label>
                            <label className="block text-sm font-bold text-slate-700">
                                Department
                                <input
                                    {...form.register("department")}
                                    maxLength={120}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                                />
                                {form.formState.errors.department && <span className="mt-1 block text-xs font-medium text-rose-700">{form.formState.errors.department.message}</span>}
                            </label>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setEditingCourse(null)} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button type="submit" disabled={form.formState.isSubmitting} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                                    {form.formState.isSubmitting ? "Saving..." : "Save changes"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </section>
    );
}
