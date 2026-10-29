import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, X } from "lucide-react";
import StudentForm from "@/components/forms/StudentForm";
import { StudentService } from "@/services/student.service";
import type { Student } from "@/types/student";
import type { StudentFormData } from "@/lib/validators";

const PAGE_SIZE = 10;

export default function FacultyStudentDirectory() {
    const [students, setStudents] = useState<Student[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [year, setYear] = useState("");
    const [course, setCourse] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const fetchStudents = useCallback(() => StudentService.list({
        page,
        limit: PAGE_SIZE,
        search,
        ...(year ? { year: Number(year) } : {}),
        ...(course ? { course } : {})
    }), [course, page, search, year]);

    useEffect(() => {
        let active = true;
        fetchStudents().then(result => {
            if (!active) return;
            setStudents(result.data);
            setTotal(result.meta.total);
            setError("");
        }).catch(loadError => {
            console.error("Failed to load faculty student directory:", loadError);
            if (active) setError("Student records could not be loaded. Please try again.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => {
            active = false;
        };
    }, [fetchStudents]);

    async function retryLoadingStudents() {
        setLoading(true);
        setError("");
        try {
            const result = await fetchStudents();
            setStudents(result.data);
            setTotal(result.meta.total);
        } catch (loadError) {
            console.error("Failed to load faculty student directory:", loadError);
            setError("Student records could not be loaded. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function updateStudent(data: StudentFormData) {
        if (!editingStudent) return;
        try {
            await StudentService.update(editingStudent.id, data);
        } catch (updateError) {
            console.error("Failed to update student information:", updateError);
            toast.error("Student information could not be updated. Please try again.");
            return;
        }

        toast.success("Student information updated.");
        setEditingStudent(null);
        try {
            const result = await fetchStudents();
            setStudents(result.data);
            setTotal(result.meta.total);
        } catch (refreshError) {
            console.error("Student was updated, but the directory refresh failed:", refreshError);
            toast.error("Student was saved, but the directory could not refresh. Try reloading the page.");
        }
    }

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Student Directory</h2>
                        <p className="mt-1 text-sm text-slate-500">Institution-wide student records. Updates are saved to the shared academic database.</p>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{total} students</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="relative block">
                        <span className="sr-only">Search students</span>
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={event => {
                                setLoading(true);
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search name, ID, or email"
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </label>
                    <label className="text-sm text-slate-600">
                        <span className="sr-only">Filter by academic year</span>
                        <input
                            type="number"
                            min={1900}
                            max={2200}
                            step={1}
                            value={year}
                            onChange={event => {
                                setLoading(true);
                                setYear(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Filter by year"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </label>
                    <label className="text-sm text-slate-600">
                        <span className="sr-only">Filter by course</span>
                        <input
                            value={course}
                            onChange={event => {
                                setLoading(true);
                                setCourse(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Filter by course or program"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="p-10 text-center text-sm font-semibold text-slate-500" role="status">Loading students...</div>
            ) : error ? (
                <div className="p-8 text-center">
                    <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>
                    <button type="button" onClick={() => void retryLoadingStudents()} className="mt-3 text-sm font-bold text-emerald-700 hover:underline">Retry</button>
                </div>
            ) : students.length === 0 ? (
                <p className="p-10 text-center text-sm text-slate-500">No students match the current search or filters.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-5 py-3">Student ID</th>
                                <th className="px-5 py-3">Name</th>
                                <th className="px-5 py-3">Email</th>
                                <th className="px-5 py-3">Course / Program</th>
                                <th className="px-5 py-3">Year</th>
                                <th className="px-5 py-3">GPA</th>
                                <th className="px-5 py-3">Account</th>
                                <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {students.map(student => (
                                <tr key={student.id} className="hover:bg-slate-50/70">
                                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">#{student.id}</td>
                                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-900">{student.name}</td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{student.email || "—"}</td>
                                    <td className="px-5 py-4 text-slate-600">{student.course}</td>
                                    <td className="px-5 py-4 text-slate-600">{student.year}</td>
                                    <td className="px-5 py-4 font-semibold text-slate-700">{student.gpa.toFixed(2)}</td>
                                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{student.accountStatus || "—"}</td>
                                    <td className="whitespace-nowrap px-5 py-4 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setEditingStudent(student)}
                                            className="rounded-lg px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
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

            {editingStudent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4" role="presentation">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="edit-student-title"
                        className="relative max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-8"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 id="edit-student-title" className="text-xl font-black text-slate-900">Update student #{editingStudent.id}</h2>
                                <p className="mt-1 text-sm text-slate-500">Student ID, email, and account status cannot be changed here.</p>
                            </div>
                            <button
                                type="button"
                                aria-label="Close edit student form"
                                onClick={() => setEditingStudent(null)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        <StudentForm
                            defaultValues={{
                                name: editingStudent.name,
                                year: editingStudent.year,
                                course: editingStudent.course,
                                gpa: editingStudent.gpa
                            }}
                            onSubmit={updateStudent}
                        />
                    </section>
                </div>
            )}
        </section>
    );
}
