import { useCallback, useEffect, useState } from "react";
import { Bell, Pin, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { AcademicActivityService, type AnnouncementInput } from "@/services/academic-activity.service";
import type { Announcement, AnnouncementCategory } from "@/types/academic-activity";
import type { Course } from "@/types/course";
import { useAuth } from "@/lib/auth-context";

const categories: { value: AnnouncementCategory; label: string }[] = [
    { value: "general_notice", label: "General Notice" },
    { value: "examination_schedule", label: "Examination Schedule" },
    { value: "assignment", label: "Assignment" },
    { value: "important_notice", label: "Important Notice" }
];

const today = () => new Date().toISOString().slice(0, 10);
const emptyInput = (): AnnouncementInput => ({
    courseId: 0,
    title: "",
    description: "",
    category: "general_notice",
    publicationDate: today(),
    expiryDate: null,
    isPinned: false
});

function isAnnouncementInput(form: AnnouncementInput): form is AnnouncementInput & { courseId: number } {
    return form.courseId > 0;
}

export default function AnnouncementsPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [form, setForm] = useState<AnnouncementInput>(emptyInput());
    const [editing, setEditing] = useState<number | null>(null);
    const [courseFilter, setCourseFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const availableCourses = courses;

    const loadAnnouncements = useCallback(async () => {
        try {
            const records = await AcademicActivityService.allAnnouncements({
                ...(courseFilter ? { courseId: Number(courseFilter) } : {}),
                ...(categoryFilter ? { category: categoryFilter } : {}),
                ...(search.trim() ? { search: search.trim() } : {})
            });
            setAnnouncements(records);
        } catch (error) {
            console.error("Failed to load announcements:", error);
            toast.error("Announcements could not be loaded.");
        }
    }, [categoryFilter, courseFilter, search]);

    useEffect(() => {
        let active = true;
        Promise.all([AcademicActivityService.courseOptions(), AcademicActivityService.allAnnouncements()])
            .then(([courseRecords, announcementRecords]) => {
                if (!active) return;
                setCourses(courseRecords);
                setAnnouncements(announcementRecords);
                setForm(current => ({ ...current, courseId: courseRecords[0]?.id || 0 }));
            })
            .catch(error => {
                console.error("Failed to load announcement setup:", error);
                if (active) toast.error("Announcement data could not be loaded.");
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [user?.facultyId, user?.role]);

    useEffect(() => {
        // Fetching synchronizes the visible list with active filters.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadAnnouncements();
    }, [loadAnnouncements]);

    function canManage(announcement: Announcement) {
        return user?.role === "SUPER_ADMIN" ||
            (user?.role === "FACULTY" && announcement.createdBy === user.id &&
                availableCourses.some(course => course.id === announcement.courseId));
    }

    function startEdit(announcement: Announcement) {
        if (!canManage(announcement)) return;
        setEditing(announcement.id);
        setForm({
            courseId: announcement.courseId,
            title: announcement.title,
            description: announcement.description,
            category: announcement.category,
            publicationDate: announcement.publicationDate,
            expiryDate: announcement.expiryDate,
            isPinned: announcement.isPinned
        });
    }

    function resetForm() {
        setEditing(null);
        setForm(current => ({ ...emptyInput(), courseId: availableCourses[0]?.id || current.courseId }));
    }

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!isAnnouncementInput(form)) {
            toast.error("Select a course for this announcement.");
            return;
        }
        setSaving(true);
        try {
            if (editing) await AcademicActivityService.updateAnnouncement(editing, form);
            else await AcademicActivityService.createAnnouncement(form);
            toast.success(editing ? "Announcement updated." : "Announcement published.");
            resetForm();
            await loadAnnouncements();
        } catch (error) {
            console.error("Failed to save announcement:", error);
            const message = axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
            toast.error(message || "Announcement could not be saved.");
        } finally {
            setSaving(false);
        }
    }

    async function remove(announcement: Announcement) {
        if (!canManage(announcement) || !window.confirm(`Delete "${announcement.title}"?`)) return;
        try {
            await AcademicActivityService.deleteAnnouncement(announcement.id);
            toast.success("Announcement deleted.");
            await loadAnnouncements();
            if (editing === announcement.id) resetForm();
        } catch (error) {
            console.error("Failed to delete announcement:", error);
            toast.error("Announcement could not be deleted.");
        }
    }

    if (loading) return <main className="p-6 text-sm text-slate-600" role="status">Loading announcements...</main>;

    return (
        <main className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-[1500px] space-y-5 px-3 py-4 sm:px-5 lg:px-6">
            <header className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Academic operations</p>
                    <h1 className="mt-1 text-2xl font-black text-slate-900">Announcements</h1>
                    <p className="mt-1 text-sm text-slate-600">Publish course notices for enrolled students.</p>
                </div>
                <Bell className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            </header>

            {user?.role !== "STUDENT" && (
                <form onSubmit={event => void submit(event)} className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="font-bold text-slate-900">{editing ? "Edit announcement" : "Create announcement"}</h2>
                        {editing && <button type="button" onClick={resetForm} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Cancel edit</button>}
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <label className="text-xs font-semibold text-slate-600">Target course
                            <select required value={form.courseId || ""} onChange={event => setForm(current => ({ ...current, courseId: Number(event.target.value) }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                                <option value="">Select course</option>{availableCourses.map(course => <option key={course.id} value={course.id}>{course.code} — {course.name}{course.branch ? ` (${course.branch})` : " (Branch unassigned)"}</option>)}
                            </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-600">Category
                            <select value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value as AnnouncementCategory }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm">
                                {categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
                            </select>
                        </label>
                        <label className="text-xs font-semibold text-slate-600">Publication date
                            <input type="date" required value={form.publicationDate} onChange={event => setForm(current => ({ ...current, publicationDate: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                        </label>
                        <label className="text-xs font-semibold text-slate-600">Expiry date (optional)
                            <input type="date" value={form.expiryDate || ""} min={form.publicationDate} onChange={event => setForm(current => ({ ...current, expiryDate: event.target.value || null }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
                        </label>
                        <label className="text-xs font-semibold text-slate-600 md:col-span-2 lg:col-span-4">Title
                            <input required maxLength={180} value={form.title} onChange={event => setForm(current => ({ ...current, title: event.target.value }))} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" placeholder="Announcement title" />
                        </label>
                        <label className="text-xs font-semibold text-slate-600 md:col-span-2 lg:col-span-3">Description
                            <textarea required maxLength={10000} rows={3} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} className="mt-1 w-full resize-y rounded-lg border border-slate-300 p-3 text-sm" placeholder="Announcement details" />
                        </label>
                        <div className="flex flex-col justify-between gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <input type="checkbox" checked={form.isPinned} onChange={event => setForm(current => ({ ...current, isPinned: event.target.checked }))} className="h-4 w-4 accent-emerald-700" />
                                Pin important notice
                            </label>
                            <button type="submit" disabled={saving || !availableCourses.length} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                                <Plus className="h-4 w-4" />{saving ? "Saving..." : editing ? "Save changes" : "Publish"}
                            </button>
                        </div>
                    </div>
                    {!availableCourses.length && <p className="mt-3 text-sm text-slate-500">No courses are available. Add courses to the catalog before publishing an announcement.</p>}
                </form>
            )}

            <section className="space-y-3">
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-3">
                    <label className="relative text-[11px] font-semibold text-slate-600">
                        Search announcements
                        <Search className="absolute left-2 top-7 h-4 w-4 text-slate-400" />
                        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Title or description" className="mt-1 h-9 w-full rounded-lg border border-slate-300 pl-8 pr-2 text-xs" />
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">Course
                        <select value={courseFilter} onChange={event => setCourseFilter(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-xs">
                            <option value="">All courses</option>{availableCourses.map(course => <option key={course.id} value={course.id}>{course.code}</option>)}
                        </select>
                    </label>
                    <label className="text-[11px] font-semibold text-slate-600">Category
                        <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-xs">
                            <option value="">All categories</option>{categories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}
                        </select>
                    </label>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                    {announcements.map(announcement => (
                        <article key={announcement.id} className={`rounded-xl border bg-white p-4 shadow-sm ${announcement.isPinned || announcement.category === "important_notice" ? "border-amber-300 ring-1 ring-amber-100" : "border-slate-200"}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="mb-2 flex flex-wrap items-center gap-2">
                                        {(announcement.isPinned || announcement.category === "important_notice") && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase text-amber-800"><Pin className="h-3 w-3" />Important</span>}
                                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-800">{categories.find(category => category.value === announcement.category)?.label}</span>
                                        <span className="text-xs text-slate-500">{announcement.courseCode} — {announcement.courseName}</span>
                                    </div>
                                    <h2 className="break-words text-base font-bold text-slate-900">{announcement.title}</h2>
                                </div>
                                {canManage(announcement) && (
                                    <div className="flex shrink-0 gap-2">
                                        <button type="button" onClick={() => startEdit(announcement)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                                        <button type="button" onClick={() => void remove(announcement)} aria-label={`Delete ${announcement.title}`} className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                )}
                            </div>
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{announcement.description}</p>
                            <p className="mt-3 text-[11px] text-slate-500">Published {announcement.publicationDate}{announcement.expiryDate ? ` · Expires ${announcement.expiryDate}` : ""}</p>
                        </article>
                    ))}
                    {!announcements.length && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 lg:col-span-2">No announcements match the current filters.</p>}
                </div>
            </section>
        </main>
    );
}
