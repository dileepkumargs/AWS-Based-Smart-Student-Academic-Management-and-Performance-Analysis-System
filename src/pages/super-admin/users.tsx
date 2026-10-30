import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { UserPlus, KeyRound, UserX, UserCheck, Search } from "lucide-react";
import { CourseService } from "@/services/course.service";
import type { Course } from "@/types/course";

type AccountRole = "STUDENT" | "FACULTY";
interface Account {
    id: number;
    email: string;
    displayName: string;
    role: "SUPER_ADMIN" | AccountRole;
    isActive: boolean;
    mustChangePassword: boolean;
}

interface AccountForm {
    role: AccountRole;
    email: string;
    password: string;
    name: string;
    year: number;
    courseId: string;
    gpa: number;
    department: string;
    specialization: string;
    phone: string;
    studentId: string;
    facultyId: string;
}

interface UnlinkedStudent {
    id: number;
    name: string;
    year: number;
    course: string;
    courseId: number | null;
    courseCode: string | null;
    courseName: string | null;
    gpa: number;
}

interface UnlinkedFaculty {
    id: number;
    name: string;
    email: string;
    department: string;
    specialization: string;
    phone?: string;
}

const initialForm: AccountForm = {
    role: "STUDENT",
    email: "",
    password: "",
    name: "",
    year: new Date().getFullYear(),
    courseId: "",
    gpa: 0,
    department: "",
    specialization: "",
    phone: "",
    studentId: "",
    facultyId: ""
};

export default function SuperAdminUsersPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [form, setForm] = useState<AccountForm>(initialForm);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [credentialMessage, setCredentialMessage] = useState("");
    const [unlinkedStudents, setUnlinkedStudents] = useState<UnlinkedStudent[]>([]);
    const [unlinkedFaculty, setUnlinkedFaculty] = useState<UnlinkedFaculty[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [profilesLoading, setProfilesLoading] = useState(true);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [profilesError, setProfilesError] = useState("");
    const [coursesError, setCoursesError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchAccounts = useCallback(async () => {
        const params = new URLSearchParams({ page: String(page), limit: "20", search });
        const response = await fetch(`/api/users?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load user accounts.");
        return await response.json() as { data: Account[]; meta: { total: number } };
    }, [page, search]);

    async function loadAccounts() {
        setLoading(true);
        try {
            const result = await fetchAccounts();
            setAccounts(result.data);
            setTotalAccounts(result.meta.total);
        } catch (error) {
            console.error("Failed to load user accounts:", error);
            toast.error("Unable to load user accounts.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let active = true;
        fetchAccounts().then(result => {
            if (active) {
                setAccounts(result.data);
                setTotalAccounts(result.meta.total);
            }
        }).catch(error => {
            console.error("Failed to load user accounts:", error);
            if (active) toast.error("Unable to load user accounts.");
        }).finally(() => {
            if (active) setLoading(false);
        });
        return () => { active = false; };
    }, [fetchAccounts]);

    useEffect(() => {
        const role = form.role;
        let active = true;
        async function loadProfiles<T>(url: string): Promise<T[]> {
            const firstResponse = await fetch(`${url}&page=1&limit=100`, { cache: "no-store" });
            if (!firstResponse.ok) throw new Error("Unable to load unlinked profiles.");
            const firstPage = await firstResponse.json() as { data: T[]; meta: { total: number; limit: number } };
            const pageCount = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
            if (pageCount <= 1) return firstPage.data;
            const otherPages = await Promise.all(
                Array.from({ length: pageCount - 1 }, async (_, index) => {
                    const response = await fetch(`${url}&page=${index + 2}&limit=100`, { cache: "no-store" });
                    if (!response.ok) throw new Error("Unable to load unlinked profiles.");
                    return await response.json() as { data: T[] };
                })
            );
            return firstPage.data.concat(...otherPages.map(pageResult => pageResult.data));
        }
        async function loadCourses() {
            const firstPage = await CourseService.list({ page: 1, limit: 100 });
            const pageCount = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
            if (pageCount <= 1) return firstPage.data;
            const otherPages = await Promise.all(
                Array.from({ length: pageCount - 1 }, (_, index) =>
                    CourseService.list({ page: index + 2, limit: 100 })
                )
            );
            return firstPage.data.concat(...otherPages.map(pageResult => pageResult.data));
        }

        // The form starts in the Student role; switching roles uses the cached faculty profile list.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProfilesLoading(true);
        if (role === "STUDENT") {
            setProfilesError("");
            setCoursesLoading(true);
            setCoursesError("");
            loadProfiles<UnlinkedStudent>("/api/users/profiles?role=STUDENT")
                .then(records => { if (active) setUnlinkedStudents(records); })
                .catch(error => {
                    console.error("Failed to load unlinked student profiles:", error);
                    if (active) setProfilesError("Student profiles could not be loaded.");
                })
                .finally(() => { if (active) setProfilesLoading(false); });
            loadCourses()
                .then(records => { if (active) setCourses(records); })
                .catch(error => {
                    console.error("Failed to load course options:", error);
                    if (active) setCoursesError("Courses could not be loaded.");
                })
                .finally(() => { if (active) setCoursesLoading(false); });
        } else {
            setProfilesError("");
            loadProfiles<UnlinkedFaculty>("/api/users/profiles?role=FACULTY")
                .then(records => { if (active) setUnlinkedFaculty(records); })
                .catch(error => {
                    console.error("Failed to load unlinked faculty profiles:", error);
                    if (active) setProfilesError("Faculty profiles could not be loaded.");
                })
                .finally(() => { if (active) setProfilesLoading(false); });
        }
        return () => { active = false; };
    }, [form.role]);

    async function createAccount(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setCredentialMessage("");
        const payload = form.role === "STUDENT"
            ? {
                role: form.role, email: form.email, password: form.password, name: form.name,
                ...(form.studentId
                    ? { studentId: Number(form.studentId) }
                    : { year: Number(form.year), courseId: Number(form.courseId), gpa: Number(form.gpa) })
            }
            : {
                role: form.role, email: form.email, password: form.password, name: form.name,
                department: form.department, specialization: form.specialization, phone: form.phone || undefined,
                ...(form.facultyId ? { facultyId: Number(form.facultyId) } : {})
            };
        try {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json() as { message?: string; email?: string; role?: string };
            if (!response.ok) throw new Error(result.message || "Unable to create account.");
            setCredentialMessage(`Account created for ${result.email}. Share the initial password through an approved secure channel; the user must change it at first sign-in.`);
            toast.success("Account created. The user must change the password after sign-in.");
            setForm(initialForm);
            setLoading(true);
            await loadAccounts();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to create account.");
        } finally {
            setSaving(false);
        }
    }

    async function updateAccount(account: Account, action: "activate" | "deactivate" | "reset-password") {
        if (action === "deactivate" && !window.confirm(`Deactivate ${account.email}? Their current sessions will be revoked.`)) return;
        if (action === "reset-password" && !window.confirm(`Reset the password for ${account.email}? Their current sessions will be revoked.`)) return;
        try {
            const response = await fetch(`/api/users/${account.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });
            const result = await response.json() as { message?: string; temporaryPassword?: string };
            if (!response.ok) throw new Error(result.message || "Unable to update account.");
            if (result.temporaryPassword) {
                setCredentialMessage(`Temporary password for ${account.email}: ${result.temporaryPassword}. Copy it now and deliver it through an approved secure channel; it will not be shown again.`);
            }
            toast.success(action === "reset-password" ? "Password reset. Share the temporary password securely." : `Account ${action}d.`);
            setLoading(true);
            await loadAccounts();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Unable to update account.");
        }
    }

    return (
        <main className="mx-auto max-w-7xl space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Super Admin</p>
                <h1 className="mt-2 text-4xl font-black text-slate-900">Account management</h1>
                <p className="mt-2 text-slate-600">Create faculty and student accounts. Super Admin accounts are created only through the one-time secure CLI bootstrap.</p>
            </header>

            {credentialMessage && (
                <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    {credentialMessage}
                    <button className="ml-3 font-bold underline" onClick={() => setCredentialMessage("")}>Dismiss</button>
                </div>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                    <span className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><UserPlus aria-hidden="true" /></span>
                    <div><h2 className="text-xl font-extrabold text-slate-900">Create an account</h2><p className="text-sm text-slate-500">The account holder must replace the initial password after the first login.</p></div>
                </div>
                <form onSubmit={createAccount} className="grid gap-5 md:grid-cols-2">
                    <label className="text-sm font-bold text-slate-700">Account role
                        <select value={form.role} onChange={event => setForm({ ...initialForm, role: event.target.value as AccountRole })} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
                            <option value="STUDENT">Student</option>
                            <option value="FACULTY">Faculty</option>
                        </select>
                    </label>
                    <label className="text-sm font-bold text-slate-700">Institutional email
                        <input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm(value => ({ ...value, email: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </label>
                    <label className="text-sm font-bold text-slate-700">Full name
                        <input required minLength={2} maxLength={120} value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </label>
                    <label className="text-sm font-bold text-slate-700">Initial password (12+ characters)
                        <input required minLength={12} maxLength={256} type="password" autoComplete="new-password" value={form.password} onChange={event => setForm(value => ({ ...value, password: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
                    </label>
                    {form.role === "STUDENT" ? (
                        <>
                            <label className="text-sm font-bold text-slate-700">Link an existing student profile (optional)
                                <select value={form.studentId} onChange={event => {
                                    const profile = unlinkedStudents.find(student => student.id === Number(event.target.value));
                                    const matchingCourse = profile && courses.find(course =>
                                        course.id === profile.courseId ||
                                        course.name.toLowerCase() === profile.course.toLowerCase() ||
                                        course.code.toLowerCase() === profile.course.toLowerCase()
                                    );
                                    setForm(value => ({
                                        ...value,
                                        studentId: event.target.value,
                                        ...(profile
                                            ? {
                                                name: profile.name,
                                                year: profile.year,
                                                courseId: matchingCourse ? String(matchingCourse.id) : "",
                                                gpa: profile.gpa
                                            }
                                            : { name: "", year: new Date().getFullYear(), courseId: "", gpa: 0 })
                                    }));
                                }} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
                                    <option value="">Create a new student profile</option>
                                    {unlinkedStudents.map(profile => <option key={profile.id} value={profile.id}>{profile.name} — Student ID / USN #{profile.id}</option>)}
                                </select>
                            </label>
                            {profilesLoading && <p className="text-sm font-medium text-slate-500">Loading student profiles…</p>}
                            {profilesError && <p role="alert" className="text-sm font-medium text-rose-700">{profilesError}</p>}
                            {!profilesLoading && !profilesError && unlinkedStudents.length === 0 && (
                                <p className="text-sm text-slate-500">No unlinked student profiles are available. Profiles already linked to accounts are excluded to prevent duplicate links.</p>
                            )}
                            {!form.studentId && (
                                <>
                                    <label className="text-sm font-bold text-slate-700">Academic year
                                        <input required type="number" min={1900} max={2200} value={form.year} onChange={event => setForm(value => ({ ...value, year: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
                                    </label>
                                    <label className="text-sm font-bold text-slate-700">Program / course
                                        <select required value={form.courseId} disabled={coursesLoading || courses.length === 0} onChange={event => setForm(value => ({ ...value, courseId: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 disabled:bg-slate-100">
                                            <option value="">{coursesLoading ? "Loading courses…" : "Select a course"}</option>
                                            {courses.map(course => <option key={course.id} value={course.id}>{course.code} — {course.name}</option>)}
                                        </select>
                                        {coursesError && <span role="alert" className="mt-1 block text-xs font-medium text-rose-700">{coursesError}</span>}
                                        {!coursesLoading && !coursesError && courses.length === 0 && <span className="mt-1 block text-xs font-medium text-slate-500">No courses are available in the catalog.</span>}
                                    </label>
                                    <label className="text-sm font-bold text-slate-700">Current GPA
                                        <input required type="number" min={0} max={4} step="0.01" value={form.gpa} onChange={event => setForm(value => ({ ...value, gpa: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
                                    </label>
                                </>
                            )}
                            {form.studentId && (() => {
                                const profile = unlinkedStudents.find(student => student.id === Number(form.studentId));
                                if (!profile) return null;
                                const course = courses.find(option => option.id === profile.courseId);
                                return (
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-slate-700 md:col-span-2">
                                        <p className="font-bold text-slate-900">Existing student profile · ID / USN #{profile.id}</p>
                                        <p className="mt-1">Academic year: {profile.year} · GPA: {profile.gpa.toFixed(2)}</p>
                                        <p>Program / course: {course ? `${course.code} — ${course.name}` : profile.course}</p>
                                    </div>
                                );
                            })()}
                        </>
                    ) : (
                        <>
                            <label className="text-sm font-bold text-slate-700">Link an existing faculty profile (optional)
                                <select value={form.facultyId} onChange={event => {
                                    const profile = unlinkedFaculty.find(faculty => faculty.id === Number(event.target.value));
                                    setForm(value => ({
                                        ...value,
                                        facultyId: event.target.value,
                                        ...(profile ? {
                                            name: profile.name,
                                            email: profile.email,
                                            department: profile.department,
                                            specialization: profile.specialization,
                                            phone: profile.phone || ""
                                        } : {})
                                    }));
                                }} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3">
                                    <option value="">Create a new faculty profile or link by email</option>
                                    {unlinkedFaculty.map(profile => <option key={profile.id} value={profile.id}>#{profile.id} — {profile.name}</option>)}
                                </select>
                            </label>
                            <label className="text-sm font-bold text-slate-700">Department
                                <input required minLength={2} maxLength={120} value={form.department} onChange={event => setForm(value => ({ ...value, department: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
                            </label>
                            <label className="text-sm font-bold text-slate-700">Specialization
                                <input required minLength={2} maxLength={160} value={form.specialization} onChange={event => setForm(value => ({ ...value, specialization: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
                            </label>
                            <label className="text-sm font-bold text-slate-700">Phone (optional)
                                <input maxLength={40} value={form.phone} onChange={event => setForm(value => ({ ...value, phone: event.target.value }))} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" />
                            </label>
                        </>
                    )}
                    <div className="md:col-span-2">
                        <button disabled={saving || (form.role === "STUDENT" && !form.studentId && (coursesLoading || courses.length === 0))} className="rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60">{saving ? "Creating..." : "Create account"}</button>
                    </div>
                </form>
            </section>

            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div><h2 className="text-xl font-extrabold text-slate-900">Accounts</h2><p className="text-sm text-slate-500">Resetting a password revokes the user&apos;s active sessions.</p></div>
                    <label className="relative block w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input aria-label="Search users" value={search} onChange={event => {
                            setSearch(event.target.value);
                            setPage(1);
                            setLoading(true);
                        }} placeholder="Search name or email" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm" />
                    </label>
                </div>
                {loading ? <p className="p-8 text-slate-500" role="status">Loading accounts...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {accounts.map(account => (
                                    <tr key={account.id}>
                                        <td className="px-6 py-4 font-bold text-slate-900">{account.displayName}</td>
                                        <td className="px-6 py-4 text-slate-600">{account.email}</td>
                                        <td className="px-6 py-4">{account.role.replace("_", " ")}</td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${account.isActive ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                                                {account.isActive ? account.mustChangePassword ? "Must update password" : "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button onClick={() => void updateAccount(account, "reset-password")} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"><KeyRound className="h-4 w-4" aria-hidden="true" />Reset</button>
                                                <button onClick={() => void updateAccount(account, account.isActive ? "deactivate" : "activate")} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-200">
                                                    {account.isActive ? <><UserX className="h-4 w-4" aria-hidden="true" />Deactivate</> : <><UserCheck className="h-4 w-4" aria-hidden="true" />Activate</>}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {accounts.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No matching accounts.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
                {!loading && totalAccounts > 20 && (
                    <nav aria-label="Account pages" className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm">
                        <span className="text-slate-500">
                            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, totalAccounts)} of {totalAccounts}
                        </span>
                        <div className="flex gap-2">
                            <button type="button" disabled={page === 1} onClick={() => {
                                setLoading(true);
                                setPage(current => current - 1);
                            }} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold disabled:opacity-40">Previous</button>
                            <button type="button" disabled={page * 20 >= totalAccounts} onClick={() => {
                                setLoading(true);
                                setPage(current => current + 1);
                            }} className="rounded-lg border border-slate-300 px-3 py-2 font-semibold disabled:opacity-40">Next</button>
                        </div>
                    </nav>
                )}
            </section>
        </main>
    );
}
