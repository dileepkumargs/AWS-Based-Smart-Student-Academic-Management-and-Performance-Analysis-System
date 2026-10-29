import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { StudentService } from "@/services/student.service";
import { EnrollmentService } from "@/services/enrollment.service";
import type { Student } from "@/types/student";
import type { EnrollmentWithDetails } from "@/types/enrollment";
import { BookOpen, GraduationCap, TrendingUp } from "lucide-react";

export default function StudentDashboardPage() {
    const { user } = useAuth();
    const [student, setStudent] = useState<Student | null>(null);
    const [studentOptions, setStudentOptions] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(user?.studentId ?? null);
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user?.role !== "SUPER_ADMIN") return;
        let active = true;
        StudentService.list({ page: 1, limit: 100 }).then(result => {
            if (active) {
                setStudentOptions(result.data);
                setSelectedStudentId(current => current ?? result.data[0]?.id ?? null);
                if (result.data.length === 0) setLoading(false);
            }
        }).catch(loadError => {
            console.error("Failed to load student accounts for administrator view:", loadError);
            if (active) {
                setError("Student records could not be loaded.");
                setLoading(false);
            }
        });
        return () => { active = false; };
    }, [user]);

    useEffect(() => {
        const studentId = user?.role === "STUDENT" ? user.studentId : selectedStudentId;
        if (typeof studentId !== "number" || (user?.role !== "STUDENT" && user?.role !== "SUPER_ADMIN")) return;
        let active = true;
        async function loadDashboard(id: number) {
            try {
                const [profile, academicHistory] = await Promise.all([
                    StudentService.getById(id),
                    EnrollmentService.getByStudent(id)
                ]);
                if (active) {
                    setStudent(profile);
                    setEnrollments(academicHistory);
                }
            } catch (loadError) {
                console.error("Failed to load student dashboard:", loadError);
                if (active) setError("Your academic dashboard could not be loaded.");
            } finally {
                if (active) setLoading(false);
            }
        }
        void loadDashboard(studentId);
        return () => { active = false; };
    }, [selectedStudentId, user]);

    if (loading) {
        return <main className="mx-auto max-w-6xl p-8" role="status">Loading your academic dashboard...</main>;
    }

    return (
        <main className="mx-auto max-w-6xl space-y-8 p-6 sm:p-8">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-900 to-slate-900 p-8 text-white sm:p-10">
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Student portal</p>
                <h1 className="mt-3 text-3xl font-black sm:text-4xl">Welcome, {student?.name || user?.displayName}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Review your current academic profile and course history. Grades shown here are recorded results, not predictions.</p>
                {user?.role === "SUPER_ADMIN" && studentOptions.length > 0 && (
                    <label className="mt-5 block max-w-sm text-sm font-bold text-white">
                        Viewing student
                        <select
                            value={selectedStudentId ?? ""}
                            onChange={event => setSelectedStudentId(Number(event.target.value))}
                            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3"
                        >
                            {studentOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                        </select>
                    </label>
                )}
            </div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
            <section className="grid gap-5 sm:grid-cols-3" aria-label="Academic summary">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <GraduationCap className="h-6 w-6 text-emerald-700" />
                    <p className="mt-4 text-sm font-semibold text-slate-500">Current GPA</p>
                    <p className="mt-1 text-3xl font-black text-slate-900">{student ? student.gpa.toFixed(2) : "—"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <BookOpen className="h-6 w-6 text-blue-700" />
                    <p className="mt-4 text-sm font-semibold text-slate-500">Course records</p>
                    <p className="mt-1 text-3xl font-black text-slate-900">{enrollments.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <TrendingUp className="h-6 w-6 text-violet-700" />
                    <p className="mt-4 text-sm font-semibold text-slate-500">Program</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{student?.course || "Not available"}</p>
                </div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-6 py-5">
                    <h2 className="text-xl font-extrabold text-slate-900">My course history</h2>
                    <p className="mt-1 text-sm text-slate-500">Only records associated with your account are shown.</p>
                </div>
                {enrollments.length === 0 ? (
                    <p className="p-8 text-sm text-slate-500">No course records are available yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr><th className="px-6 py-3">Course</th><th className="px-6 py-3">Term</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Grade</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {enrollments.map(enrollment => (
                                    <tr key={enrollment.id}>
                                        <td className="px-6 py-4">
                                            <Link href={`/courses/${enrollment.courseId}`} className="font-bold text-emerald-800 hover:underline">
                                                {enrollment.courseCode} — {enrollment.courseName}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{enrollment.semester} {enrollment.year}</td>
                                        <td className="px-6 py-4 capitalize text-slate-600">{enrollment.status}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{enrollment.grade || "Pending"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
