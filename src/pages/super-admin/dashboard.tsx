import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, BookOpen, ShieldCheck } from "lucide-react";
import { CourseService } from "@/services/course.service";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface Summary {
    courses: number;
    loading: boolean;
}

export default function SuperAdminDashboardPage() {
    const [summary, setSummary] = useState<Summary>({ courses: 0, loading: true });

    useEffect(() => {
        let active = true;
        CourseService.list({ page: 1, limit: 1 }).then(courses => {
            if (active) setSummary({
                courses: courses.meta.total,
                loading: false
            });
        }).catch(error => {
            console.error("Failed to load administrator dashboard:", error);
            if (active) setSummary(previous => ({ ...previous, loading: false }));
        });
        return () => { active = false; };
    }, []);

    return (
        <main className="mx-auto max-w-7xl space-y-8 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Institution administration</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Super Admin Dashboard</h1>
                <p className="mt-2 text-slate-600">Manage institution records and role accounts. Counts reflect records currently stored in the academic database.</p>
            </header>
            <section className="grid gap-5 md:grid-cols-3" aria-label="Institution summary">
                <StatCard title="Courses" value={summary.loading ? "..." : summary.courses} description="Course catalog" icon={BookOpen} iconClassName="bg-amber-50 text-amber-700" />
            </section>
            <Card>
                <CardHeader><CardTitle>Administration</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Link href="/super-admin/users" className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-400 hover:bg-emerald-50">
                        <span className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><ShieldCheck aria-hidden="true" /></span>
                        <span><span className="block font-bold text-slate-900">Manage accounts</span><span className="text-sm text-slate-500">Provision staff and student access</span></span>
                    </Link>
                    <Link href="/super-admin/audit-logs" className="flex items-center gap-4 rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-400 hover:bg-emerald-50">
                        <span className="rounded-xl bg-blue-100 p-3 text-blue-800"><Users aria-hidden="true" /></span>
                        <span><span className="block font-bold text-slate-900">Audit API</span><span className="text-sm text-slate-500">Administrative changes are recorded</span></span>
                    </Link>
                    <Link href="/courses" className="rounded-2xl border border-slate-200 p-5 font-bold text-slate-800 hover:border-emerald-400">Course catalog</Link>
                </CardContent>
            </Card>
        </main>
    );
}
