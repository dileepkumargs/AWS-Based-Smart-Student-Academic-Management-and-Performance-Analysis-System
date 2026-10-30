import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { StudentService } from "@/services/student.service";
import { EnrollmentService } from "@/services/enrollment.service";
import type { Student } from "@/types/student";
import type { EnrollmentWithDetails } from "@/types/enrollment";
import { BookOpen, GraduationCap, TrendingUp } from "lucide-react";
import { AcademicActivityService } from "@/services/academic-activity.service";
import type { Announcement, AttendanceRecord, TimetableEntry } from "@/types/academic-activity";
import type { Weekday } from "@/types/academic-activity";

const weekdays: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekdayOrder(day: Weekday | null) {
    return day ? weekdays.indexOf(day) : weekdays.length;
}

export default function StudentDashboardPage() {
    const { user } = useAuth();
    const [student, setStudent] = useState<Student | null>(null);
    const [studentOptions, setStudentOptions] = useState<Student[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(user?.studentId ?? null);
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (user?.role !== "SUPER_ADMIN") return;
        let active = true;
        async function loadStudents() {
            const firstPage = await StudentService.list({ page: 1, limit: 100 });
            const pageCount = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
            const remainingPages = await Promise.all(
                Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
                    StudentService.list({ page: index + 2, limit: 100 })
                )
            );
            return firstPage.data.concat(...remainingPages.map(page => page.data));
        }
        loadStudents().then(records => {
            if (active) {
                setStudentOptions(records);
                setSelectedStudentId(current => current ?? records[0]?.id ?? null);
                if (records.length === 0) setLoading(false);
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
                const studentFilter = user?.role === "SUPER_ADMIN" ? { studentId: id } : {};
                const [profile, academicHistory, attendanceRecords, courseAnnouncements, timetableEntries] = await Promise.all([
                    StudentService.getById(id),
                    EnrollmentService.getByStudent(id),
                    AcademicActivityService.allAttendance(studentFilter),
                    AcademicActivityService.allAnnouncements(studentFilter),
                    AcademicActivityService.allTimetable(studentFilter)
                ]);
                if (active) {
                    setStudent(profile);
                    setEnrollments(academicHistory);
                    setAttendance(attendanceRecords.data);
                    setAnnouncements(courseAnnouncements);
                    setTimetable(timetableEntries);
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

    const attendanceByCourse = attendance.reduce<Record<string, { name: string; code: string; semester: string; year: number; total: number; attended: number }>>((result, record) => {
        const key = `${record.courseId}:${record.semester}:${record.year}`;
        const current = result[key] || {
            name: record.courseName,
            code: record.courseCode,
            semester: record.semester,
            year: record.year,
            total: 0,
            attended: 0
        };
        current.total += 1;
        if (record.status === "present" || record.status === "late") current.attended += 1;
        result[key] = current;
        return result;
    }, {});
    const enrolledTerms = new Set(enrollments
        .filter(enrollment => enrollment.status !== "dropped")
        .map(enrollment => `${enrollment.courseId}:${enrollment.semester}:${enrollment.year}`));
    const studentClasses = timetable
        .filter(entry => entry.scheduleType === "class" && enrolledTerms.has(`${entry.courseId}:${entry.semester}:${entry.year}`))
        .sort((left, right) => weekdayOrder(left.dayOfWeek) - weekdayOrder(right.dayOfWeek) || left.startTime.localeCompare(right.startTime));
    const studentExams = timetable.filter(entry =>
        entry.scheduleType === "examination" && entry.eventDate && entry.eventDate >= new Date().toISOString().slice(0, 10) &&
        enrolledTerms.has(`${entry.courseId}:${entry.semester}:${entry.year}`)
    ).sort((left, right) => (left.eventDate || "").localeCompare(right.eventDate || "") || left.startTime.localeCompare(right.startTime));

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
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Attendance history">
                <div className="mb-4">
                    <h2 className="text-xl font-extrabold text-slate-900">Attendance</h2>
                    <p className="mt-1 text-sm text-slate-500">Course attendance rates include present and late marks. Attendance is view-only.</p>
                </div>
                {Object.keys(attendanceByCourse).length ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(attendanceByCourse).map(([id, record]) => {
                            const percentage = Math.round(record.attended * 10000 / record.total) / 100;
                            return (
                                <article key={id} className={`rounded-xl border p-4 ${percentage < 75 ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
                                    <h3 className="font-bold text-slate-900">{record.code} — {record.name}</h3>
                                    <p className="mt-1 text-xs text-slate-500">{record.semester} {record.year}</p>
                                    <p className={`mt-2 text-2xl font-black ${percentage < 75 ? "text-rose-700" : "text-emerald-700"}`}>{percentage}%</p>
                                    <p className="text-xs text-slate-500">{record.attended} attended / {record.total} recorded</p>
                                    {percentage < 75 && <p className="mt-2 text-xs font-bold text-rose-700">Below 75% attendance</p>}
                                </article>
                            );
                        })}
                    </div>
                ) : <p className="text-sm text-slate-500">No attendance records are available.</p>}
                {attendance.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <thead className="text-xs uppercase tracking-wide text-slate-500"><tr><th className="py-2">Course</th><th className="py-2">Date</th><th className="py-2">Status</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {attendance.slice(0, 20).map(record => <tr key={record.id}><td className="py-2">{record.courseCode} — {record.courseName}</td><td className="py-2">{record.attendanceDate}</td><td className="py-2 capitalize">{record.status}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Course announcements">
                <div className="mb-4">
                    <h2 className="text-xl font-extrabold text-slate-900">Course announcements</h2>
                    <p className="mt-1 text-sm text-slate-500">Published announcements for your enrolled courses.</p>
                </div>
                <div className="space-y-3">
                    {announcements.slice(0, 10).map(announcement => (
                        <article key={announcement.id} className={`rounded-xl border p-4 ${announcement.isPinned || announcement.category === "important_notice" ? "border-amber-300 bg-amber-50" : "border-slate-200"}`}>
                            <div className="flex flex-wrap items-center gap-2">
                                {(announcement.isPinned || announcement.category === "important_notice") && <span className="rounded-full bg-amber-200 px-2 py-1 text-[10px] font-bold uppercase text-amber-900">Important</span>}
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-800">{announcement.category.replace(/_/g, " ")}</span>
                                <span className="text-xs text-slate-500">{announcement.courseCode} · {announcement.publicationDate}</span>
                            </div>
                            <h3 className="mt-2 font-bold text-slate-900">{announcement.title}</h3>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{announcement.description}</p>
                        </article>
                    ))}
                    {!announcements.length && <p className="text-sm text-slate-500">No published announcements.</p>}
                </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Class timetable and examinations">
                <div className="mb-4">
                    <h2 className="text-xl font-extrabold text-slate-900">Weekly timetable</h2>
                    <p className="mt-1 text-sm text-slate-500">Classes and upcoming examination schedules for your enrolled courses.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {weekdays.map(day => {
                        const dayEntries = studentClasses.filter(entry => entry.dayOfWeek === day);
                        return (
                            <section key={day} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <h3 className="mb-2 font-bold text-slate-900">{day}</h3>
                                {dayEntries.length ? dayEntries.map(entry => (
                                    <article key={entry.id} className="border-t border-slate-200 py-2 first:border-0">
                                        <p className="text-xs font-bold text-emerald-800">{entry.startTime}–{entry.endTime}</p>
                                        <p className="mt-1 text-sm font-semibold text-slate-900">{entry.courseCode} — {entry.courseName}</p>
                                        <p className="mt-1 text-xs text-slate-600">{entry.location}</p>
                                    </article>
                                )) : <p className="text-sm text-slate-500">No classes</p>}
                            </section>
                        );
                    })}
                </div>
                <h3 className="mb-2 mt-5 font-bold text-slate-900">Upcoming examinations</h3>
                <div className="divide-y divide-slate-100">
                    {studentExams.map(entry => (
                        <div key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                            <span className="font-semibold text-slate-800">{entry.title || `${entry.courseCode} examination`} · {entry.courseName}</span>
                            <span className="text-slate-600">{entry.eventDate} · {entry.startTime}–{entry.endTime} · {entry.location}</span>
                        </div>
                    ))}
                    {!studentExams.length && <p className="text-sm text-slate-500">No upcoming examinations.</p>}
                </div>
            </section>
        </main>
    );
}
