import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Clock3, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { AcademicActivityService, type TimetableInput } from "@/services/academic-activity.service";
import type { TimetableEntry, TimetableType, Weekday } from "@/types/academic-activity";
import type { Course } from "@/types/course";
import { useAuth } from "@/lib/auth-context";

const weekdays: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function emptyEntry(courseId = 0): TimetableInput {
    return {
        courseId,
        semester: "Spring",
        year: new Date().getFullYear(),
        scheduleType: "class",
        dayOfWeek: "Monday",
        eventDate: null,
        title: null,
        startTime: "09:00",
        endTime: "10:00",
        location: ""
    };
}

function localWeekday(): Weekday | null {
    const day = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
    return weekdays.includes(day as Weekday) ? day as Weekday : null;
}

export default function TimetablePage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [entries, setEntries] = useState<TimetableEntry[]>([]);
    const [form, setForm] = useState<TimetableInput>(emptyEntry());
    const [editing, setEditing] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const availableCourses = courses;
    const classes = useMemo(() => entries.filter(entry => entry.scheduleType === "class"), [entries]);
    const examinations = useMemo(
        () => entries.filter(entry => entry.scheduleType === "examination" && entry.eventDate && entry.eventDate >= new Date().toISOString().slice(0, 10)),
        [entries]
    );
    const todayWeekday = localWeekday();

    const loadTimetable = useCallback(async () => {
        try {
            const records = await AcademicActivityService.allTimetable();
            setEntries(records);
        } catch (error) {
            console.error("Failed to load timetable:", error);
            toast.error("Timetable could not be loaded.");
        }
    }, []);

    useEffect(() => {
        let active = true;
        Promise.all([AcademicActivityService.courseOptions(), AcademicActivityService.allTimetable()])
            .then(([courseRecords, timetableRecords]) => {
                if (!active) return;
                setCourses(courseRecords);
                setEntries(timetableRecords);
                setForm(current => ({ ...current, courseId: current.courseId || courseRecords[0]?.id || 0 }));
            })
            .catch(error => {
                console.error("Failed to load timetable setup:", error);
                if (active) toast.error("Timetable data could not be loaded.");
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [user?.facultyId, user?.role]);

    function startEdit(entry: TimetableEntry) {
        setEditing(entry.id);
        setForm({
            courseId: entry.courseId,
            semester: entry.semester,
            year: entry.year,
            scheduleType: entry.scheduleType,
            dayOfWeek: entry.dayOfWeek,
            eventDate: entry.eventDate,
            title: entry.title,
            startTime: entry.startTime,
            endTime: entry.endTime,
            location: entry.location
        });
    }

    function resetForm() {
        setEditing(null);
        setForm(emptyEntry(availableCourses[0]?.id || 0));
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.courseId) {
            toast.error("Select a course for this timetable entry.");
            return;
        }
        setSaving(true);
        try {
            if (editing) await AcademicActivityService.updateTimetableEntry(editing, form);
            else await AcademicActivityService.createTimetableEntry(form);
            toast.success(editing ? "Timetable entry updated." : "Timetable entry added.");
            resetForm();
            await loadTimetable();
        } catch (error) {
            console.error("Failed to save timetable entry:", error);
            const message = axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
            toast.error(message || "Timetable entry could not be saved.");
        } finally {
            setSaving(false);
        }
    }

    async function remove(entry: TimetableEntry) {
        if (!window.confirm(`Delete the ${entry.scheduleType} schedule for ${entry.courseCode}?`)) return;
        try {
            await AcademicActivityService.deleteTimetableEntry(entry.id);
            toast.success("Timetable entry deleted.");
            await loadTimetable();
        } catch (error) {
            console.error("Failed to delete timetable entry:", error);
            toast.error("Timetable entry could not be deleted.");
        }
    }

    if (loading) return <main className="p-6 text-sm text-slate-600" role="status">Loading timetable...</main>;

    return (
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-[1600px] space-y-5 px-3 py-4 sm:px-5 lg:px-6">
            <header className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Academic operations</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-900">Timetable Management</h1>
                    <p className="mt-1 text-sm text-slate-600">Weekly classes, rooms and upcoming examinations.</p>
                </div>
                <CalendarDays className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            </header>

            {user?.role !== "STUDENT" && (
                <form onSubmit={event => void submit(event)} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="font-bold text-slate-900">{editing ? "Update schedule" : "Add schedule"}</h2>
                        {editing && <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Cancel edit</button>}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600">Course
                            <select required value={form.courseId || ""} onChange={event => setForm(current => ({ ...current, courseId: Number(event.target.value) }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                                <option value="">Select course</option>{availableCourses.map(course => <option key={course.id} value={course.id}>{course.code} — {course.name}</option>)}
                            </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-600">Schedule type
                            <select value={form.scheduleType} onChange={event => {
                                const scheduleType = event.target.value as TimetableType;
                                setForm(current => ({
                                    ...current,
                                    scheduleType,
                                    dayOfWeek: scheduleType === "class" ? "Monday" : null,
                                    eventDate: scheduleType === "examination" ? new Date().toISOString().slice(0, 10) : null
                                }));
                            }} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                                <option value="class">Class</option><option value="examination">Examination</option>
                            </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-600">Semester
                            <select value={form.semester} onChange={event => setForm(current => ({ ...current, semester: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                                {["Spring", "Summer", "Fall"].map(term => <option key={term}>{term}</option>)}
                            </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-600">Academic year
                            <input type="number" min="1900" max="2200" value={form.year} onChange={event => setForm(current => ({ ...current, year: Number(event.target.value) }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                        </label>
                        {form.scheduleType === "class" ? (
                            <label className="text-xs font-semibold text-slate-600">Day
                                <select value={form.dayOfWeek || "Monday"} onChange={event => setForm(current => ({ ...current, dayOfWeek: event.target.value as Weekday, eventDate: null }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                                    {weekdays.map(day => <option key={day}>{day}</option>)}
                                </select>
                            </label>
                        ) : (
                            <label className="text-xs font-semibold text-slate-600">Examination date
                                <input required type="date" value={form.eventDate || ""} onChange={event => setForm(current => ({ ...current, eventDate: event.target.value, dayOfWeek: null }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                            </label>
                        )}
                        <label className="text-xs font-semibold text-slate-600">Start time
                            <input required type="time" value={form.startTime} onChange={event => setForm(current => ({ ...current, startTime: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">End time
                            <input required type="time" value={form.endTime} onChange={event => setForm(current => ({ ...current, endTime: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">Classroom / lab
                            <input required maxLength={120} value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Building and room" />
                        </label>
                        {form.scheduleType === "examination" && (
                            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">Exam title (optional)
                                <input maxLength={180} value={form.title || ""} onChange={event => setForm(current => ({ ...current, title: event.target.value || null }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Midterm examination" />
                            </label>
                        )}
                        <div className="flex items-end">
                            <button type="submit" disabled={saving || !availableCourses.length} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                                <Plus className="h-4 w-4" />{saving ? "Saving..." : editing ? "Save changes" : "Add schedule"}
                            </button>
                        </div>
                    </div>
                    {!availableCourses.length && <p className="mt-3 text-sm text-slate-500">No courses are available. Add courses to the catalog before scheduling a class.</p>}
                </form>
            )}

            <section aria-label="Weekly timetable">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Weekly timetable</h2>
                    <span className="text-xs text-slate-500">Monday–Saturday</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                    {weekdays.map(day => {
                        const dayEntries = classes.filter(entry => entry.dayOfWeek === day)
                            .sort((left, right) => left.startTime.localeCompare(right.startTime));
                        const isToday = todayWeekday === day;
                        return (
                            <section key={day} className={`min-h-36 overflow-hidden rounded-xl border bg-white shadow-sm ${isToday ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200"}`}>
                                <h3 className={`border-b px-3 py-2 text-sm font-bold ${isToday ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-slate-100 bg-slate-50 text-slate-700"}`}>
                                    {day}{isToday && <span className="ml-2 text-[10px] uppercase tracking-wide">Today</span>}
                                </h3>
                                <div className="space-y-2 p-2">
                                    {dayEntries.map(entry => (
                                        <article key={entry.id} className="rounded-lg border border-slate-100 bg-white p-2.5">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-xs font-extrabold text-slate-900">{entry.courseCode}</p>
                                                <div className="flex gap-1">
                                                    <button type="button" onClick={() => startEdit(entry)} aria-label={`Edit ${entry.courseCode} class`} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>
                                                    <button type="button" onClick={() => void remove(entry)} aria-label={`Delete ${entry.courseCode} class`} className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                                                </div>
                                            </div>
                                            <p className="truncate text-xs text-slate-600" title={entry.courseName}>{entry.courseName}</p>
                                            <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-700"><Clock3 className="h-3 w-3" />{entry.startTime}–{entry.endTime}</p>
                                            <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-slate-500"><MapPin className="h-3 w-3 shrink-0" />{entry.location}</p>
                                            {user?.role === "SUPER_ADMIN" && <p className="mt-1 truncate text-[10px] text-slate-400">{entry.facultyName}</p>}
                                        </article>
                                    ))}
                                    {!dayEntries.length && <p className="px-1 py-4 text-center text-xs text-slate-400">No classes</p>}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-3">
                    <h2 className="font-bold text-slate-900">Upcoming examinations</h2>
                </div>
                <div className="divide-y divide-slate-100">
                    {examinations.map(entry => (
                        <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                            <div>
                                <p className="text-sm font-bold text-slate-900">{entry.title || `${entry.courseCode} examination`}</p>
                                <p className="text-xs text-slate-600">{entry.courseCode} — {entry.courseName} · {entry.semester} {entry.year}</p>
                                {user?.role === "SUPER_ADMIN" && <p className="text-xs text-slate-500">{entry.facultyName}</p>}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600">
                                <span>{entry.eventDate}</span><span>{entry.startTime}–{entry.endTime}</span><span>{entry.location}</span>
                                <button type="button" onClick={() => startEdit(entry)} aria-label="Edit exam schedule" className="rounded p-1 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => void remove(entry)} aria-label="Delete exam schedule" className="rounded p-1 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </div>
                    ))}
                    {!examinations.length && <p className="px-4 py-6 text-sm text-slate-500">No upcoming examinations are scheduled.</p>}
                </div>
            </section>
        </main>
    );
}
