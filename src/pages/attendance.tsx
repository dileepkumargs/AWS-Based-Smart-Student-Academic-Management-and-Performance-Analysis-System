import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Download, FileText, Search, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { AcademicActivityService } from "@/services/academic-activity.service";
import type { AttendanceRecord, AttendanceStatus, AttendanceSummary } from "@/types/academic-activity";
import type { Course } from "@/types/course";
import { useAuth } from "@/lib/auth-context";

const PAGE_SIZE = 100;
const emptySummary: AttendanceSummary = { total: 0, present: 0, absent: 0, late: 0, percentage: 0 };

function localDateValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function saveCsv(records: AttendanceRecord[]) {
    const columns = ["Student Name", "Student ID", "Email", "Course Code", "Course Name", "Semester", "Academic Year", "Date", "Status", "Attendance %"];
    const values = records.map(record => [
        record.studentName, record.studentId, record.studentEmail || "", record.courseCode,
        record.courseName, record.semester, record.year, record.attendanceDate || "",
        record.status || "", record.attendancePercentage ?? ""
    ]);
    const csv = [columns, ...values].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendance-report.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function Stat({ title, value, accent }: { title: string; value: string | number; accent: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <p className="text-xs font-semibold text-slate-500">{title}</p>
            <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
        </div>
    );
}

export default function AttendancePage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseId, setCourseId] = useState("");
    const [semester, setSemester] = useState("Spring");
    const [year, setYear] = useState(new Date().getFullYear());
    const [attendanceDate, setAttendanceDate] = useState(localDateValue());
    const [roster, setRoster] = useState<AttendanceRecord[]>([]);
    const [marks, setMarks] = useState<Record<number, AttendanceStatus | "">>({});
    const [rosterSummary, setRosterSummary] = useState<AttendanceSummary>(emptySummary);
    const [report, setReport] = useState<AttendanceRecord[]>([]);
    const [reportSummary, setReportSummary] = useState<AttendanceSummary>(emptySummary);
    const [reportCourseId, setReportCourseId] = useState("");
    const [reportSemester, setReportSemester] = useState("");
    const [reportYear, setReportYear] = useState("");
    const [reportSearch, setReportSearch] = useState("");
    const [period, setPeriod] = useState("");
    const [reportDate, setReportDate] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const availableCourses = courses;

    const loadRoster = useCallback(async () => {
        if (!courseId) {
            setRoster([]);
            setRosterSummary(emptySummary);
            return;
        }
        try {
            const result = await AcademicActivityService.allAttendance({
                mode: "roster", courseId: Number(courseId),
                semester, year, date: attendanceDate
            });
            setRoster(result.data);
            setRosterSummary(result.summary);
            setMarks(Object.fromEntries(result.data.map(record => [record.studentId, record.status || ""])));
        } catch (error) {
            console.error("Failed to load attendance roster:", error);
            toast.error("The enrolled student roster could not be loaded.");
        }
    }, [attendanceDate, courseId, semester, year]);

    const loadReport = useCallback(async () => {
        try {
            const params = {
                page: 1, limit: PAGE_SIZE,
                ...(reportCourseId ? { courseId: Number(reportCourseId) } : {}),
                ...(reportSemester ? { semester: reportSemester } : {}),
                ...(reportYear ? { year: Number(reportYear) } : {}),
                ...(reportSearch.trim() ? { search: reportSearch.trim() } : {}),
                ...(period ? { period: period as "daily" | "weekly" | "monthly", date: reportDate || localDateValue() } : {}),
                ...(!period && reportDate ? { date: reportDate } : {})
            };
            const result = await AcademicActivityService.allAttendance(params);
            setReport(result.data);
            setReportSummary(result.summary);
        } catch (error) {
            console.error("Failed to load attendance report:", error);
            toast.error("Attendance reports could not be loaded.");
        }
    }, [period, reportCourseId, reportDate, reportSearch, reportSemester, reportYear]);

    useEffect(() => {
        let active = true;
        AcademicActivityService.courseOptions().then(records => {
            if (!active) return;
            setCourses(records);
            if (records.length) setCourseId(String(records[0].id));
        }).catch(error => {
            console.error("Failed to load attendance courses:", error);
            if (active) toast.error("Course options could not be loaded.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [user?.facultyId, user?.role]);

    useEffect(() => {
        // Fetching synchronizes roster data with the selected course and term.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadRoster();
    }, [loadRoster]);

    useEffect(() => {
        // Fetching synchronizes report data with the active report filters.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadReport();
    }, [loadReport]);

    const markedCount = Object.values(marks).filter(Boolean).length;

    function setAllPresent() {
        setMarks(Object.fromEntries(roster.map(record => [record.studentId, "present"])));
    }

    async function saveAttendance() {
        const records = roster.flatMap(record => {
            const status = marks[record.studentId];
            return status ? [{ studentId: record.studentId, status }] : [];
        });
        if (!courseId || records.length === 0) {
            toast.error("Mark at least one student before saving attendance.");
            return;
        }
        setSaving(true);
        try {
            await AcademicActivityService.markAttendance({
                courseId: Number(courseId), semester, year, attendanceDate, records
            });
            toast.success(`Saved attendance for ${records.length} students.`);
            await Promise.all([loadRoster(), loadReport()]);
        } catch (error) {
            console.error("Failed to save attendance:", error);
            const message = axios.isAxiosError<{ message?: string }>(error)
                ? error.response?.data?.message
                : undefined;
            toast.error(message || "Attendance could not be saved.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return <main className="p-6 text-sm text-slate-600" role="status">Loading attendance management...</main>;
    }

    return (
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-[1600px] space-y-5 px-3 py-4 sm:px-5 lg:px-6 print:px-0">
            <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Academic operations</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-900">Attendance Management</h1>
                    <p className="mt-1 text-sm text-slate-600">Mark daily attendance and review course-wise reports.</p>
                </div>
                <CalendarCheck className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            </header>

            <section className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="text-xs font-semibold text-slate-700">Course
                        <select value={courseId} onChange={event => setCourseId(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                            <option value="">Select course</option>
                            {availableCourses.map(course => <option key={course.id} value={course.id}>{course.code} — {course.name}{course.branch ? ` (${course.branch})` : " (Branch unassigned)"}</option>)}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Semester
                        <select value={semester} onChange={event => setSemester(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                            {["Spring", "Summer", "Fall"].map(term => <option key={term}>{term}</option>)}
                        </select>
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Academic year
                        <input type="number" min="1900" max="2200" value={year} onChange={event => setYear(Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                    </label>
                    <label className="text-xs font-semibold text-slate-700">Attendance date
                        <input type="date" value={attendanceDate} onChange={event => setAttendanceDate(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                    </label>
                </div>
                {availableCourses.length === 0 && (
                    <p className="mt-3 text-sm text-slate-500">No courses are available. Add courses to the catalog before marking attendance.</p>
                )}
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-5" aria-label="Attendance statistics">
                <Stat title="Total Students" value={rosterSummary.total} accent="text-slate-900" />
                <Stat title="Present" value={rosterSummary.present} accent="text-emerald-700" />
                <Stat title="Absent" value={rosterSummary.absent} accent="text-rose-700" />
                <Stat title="Late" value={rosterSummary.late} accent="text-amber-700" />
                <Stat title="Attendance" value={`${rosterSummary.percentage}%`} accent="text-blue-700" />
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-700" />
                        <h2 className="font-bold text-slate-900">Course roster</h2>
                        <span className="text-xs text-slate-500">{markedCount}/{roster.length} marked</span>
                    </div>
                    <div className="no-print flex gap-2">
                        <button type="button" onClick={setAllPresent} disabled={!roster.length} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">Mark All Present</button>
                        <button type="button" onClick={() => void saveAttendance()} disabled={saving || !roster.length} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{saving ? "Saving..." : "Save Attendance"}</button>
                    </div>
                </div>
                <div className="max-h-[360px] overflow-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                        <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                            <tr><th className="px-4 py-2.5">Student</th><th className="px-4 py-2.5">Student ID</th><th className="px-4 py-2.5">Email</th><th className="px-4 py-2.5">Attendance</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {roster.map(record => (
                                <tr key={record.enrollmentId}>
                                    <td className="px-4 py-2.5 font-semibold text-slate-800">{record.studentName}</td>
                                    <td className="px-4 py-2.5 text-slate-600">#{record.studentId}</td>
                                    <td className="px-4 py-2.5 text-slate-600">{record.studentEmail || "—"}</td>
                                    <td className="px-4 py-2.5">
                                        <select aria-label={`Attendance for ${record.studentName}`} value={marks[record.studentId] || ""} onChange={event => setMarks(current => ({ ...current, [record.studentId]: event.target.value as AttendanceStatus | "" }))} className="h-9 w-full max-w-40 rounded-lg border border-slate-300 px-2">
                                            <option value="">Not marked</option>
                                            <option value="present">Present</option>
                                            <option value="absent">Absent</option>
                                            <option value="late">Late</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {!roster.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">Select a course and term with enrolled students.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-3">
                <div className="no-print flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Attendance reports</h2>
                        <p className="text-xs text-slate-500">Late attendance counts as attended toward the percentage.</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => saveCsv(report)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Excel CSV</button>
                        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900"><FileText className="h-4 w-4" />Save as PDF</button>
                    </div>
                </div>
                <div className="no-print grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
                    <label className="text-[11px] font-semibold text-slate-600">Search student
                        <span className="relative mt-1 block"><Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" /><input value={reportSearch} onChange={event => setReportSearch(event.target.value)} placeholder="Name or Student ID" className="h-9 w-full rounded-lg border border-slate-300 pl-8 pr-2 text-xs" /></span>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">Course
                        <select value={reportCourseId} onChange={event => setReportCourseId(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-xs">
                            <option value="">All courses</option>{availableCourses.map(course => <option key={course.id} value={course.id}>{course.code}</option>)}
                        </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">Semester
                        <input value={reportSemester} onChange={event => setReportSemester(event.target.value)} placeholder="All semesters" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-xs" />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">Academic year
                        <input type="number" value={reportYear} onChange={event => setReportYear(event.target.value)} placeholder="All years" className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-xs" />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">Period
                        <select value={period} onChange={event => setPeriod(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-xs">
                            <option value="">All dates</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                        </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">Report date
                        <input type="date" value={reportDate} onChange={event => setReportDate(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-xs" />
                    </label>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat title="Report records" value={reportSummary.total} accent="text-slate-900" />
                    <Stat title="Present" value={reportSummary.present} accent="text-emerald-700" />
                    <Stat title="Absent" value={reportSummary.absent} accent="text-rose-700" />
                    <Stat title="Attendance rate" value={`${reportSummary.percentage}%`} accent="text-blue-700" />
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left text-xs">
                            <thead className="bg-slate-800 text-[10px] uppercase tracking-wide text-white">
                                <tr><th className="px-3 py-2.5">Student</th><th className="px-3 py-2.5">ID</th><th className="px-3 py-2.5">Course</th><th className="px-3 py-2.5">Term</th><th className="px-3 py-2.5">Date</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Student attendance</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {report.map(record => (
                                    <tr key={record.id} className={(record.attendancePercentage ?? 100) < 75 ? "bg-rose-50" : ""}>
                                        <td className="px-3 py-2 font-semibold">{record.studentName}</td><td className="px-3 py-2">#{record.studentId}</td>
                                        <td className="px-3 py-2">{record.courseCode} — {record.courseName}</td><td className="px-3 py-2">{record.semester} {record.year}</td>
                                        <td className="px-3 py-2">{record.attendanceDate}</td><td className="px-3 py-2 capitalize">{record.status}</td>
                                        <td className={`px-3 py-2 font-bold ${(record.attendancePercentage ?? 100) < 75 ? "text-rose-700" : "text-emerald-700"}`}>{record.attendancePercentage}% ({record.attendedCount}/{record.attendanceCount})</td>
                                    </tr>
                                ))}
                                {!report.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No attendance records match these filters.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
            <style jsx global>{`@media print { .no-print, header + section, main > section:nth-of-type(3) { display: none !important; } body { background: white; } }`}</style>
        </main>
    );
}
