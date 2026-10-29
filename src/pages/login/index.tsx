import Link from "next/link";
import { GraduationCap, ShieldCheck, UserRound, ArrowRight } from "lucide-react";

const roles = [
    { href: "/login/faculty", label: "Faculty", description: "Manage assigned courses and support your classes.", icon: GraduationCap },
    { href: "/login/student", label: "Student", description: "Review your courses, grades, and academic progress.", icon: UserRound },
    { href: "/login/super-admin", label: "Super Admin", description: "Manage institution accounts and academic records.", icon: ShieldCheck }
];

export default function LoginSelectionPage() {
    return (
        <main className="min-h-screen bg-slate-950 px-4 py-16 sm:py-24">
            <div className="mx-auto max-w-5xl">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                        <GraduationCap className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">Academic Management System</p>
                    <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Welcome back</h1>
                    <p className="mt-4 text-lg text-slate-300">Choose your institutional account type to continue.</p>
                </div>
                <div className="mt-12 grid gap-5 md:grid-cols-3">
                    {roles.map(({ href, label, description, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className="group rounded-3xl border border-slate-700 bg-slate-900 p-7 transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-500/40"
                        >
                            <div className="flex items-center justify-between">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                                    <Icon className="h-6 w-6" aria-hidden="true" />
                                </span>
                                <ArrowRight className="h-5 w-5 text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-300" />
                            </div>
                            <h2 className="mt-8 text-xl font-extrabold text-white">{label}</h2>
                            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-300">{description}</p>
                            <span className="mt-6 inline-block text-sm font-bold text-emerald-300">Sign in <span aria-hidden="true">→</span></span>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}
