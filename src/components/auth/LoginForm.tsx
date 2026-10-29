import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Eye, EyeOff, GraduationCap, ShieldCheck, UserRound } from "lucide-react";
import type { Role } from "@/lib/auth";

const roleDetails: Record<Role, { title: string; description: string; icon: typeof GraduationCap }> = {
    SUPER_ADMIN: {
        title: "Super Admin",
        description: "Manage institution-wide academic operations and accounts.",
        icon: ShieldCheck
    },
    FACULTY: {
        title: "Faculty",
        description: "Access your assigned courses, class rosters, and grading tools.",
        icon: GraduationCap
    },
    STUDENT: {
        title: "Student",
        description: "View your courses, grades, and academic progress.",
        icon: UserRound
    }
};

interface Props {
    role: Role;
}

export default function LoginForm({ role }: Props) {
    const router = useRouter();
    const details = roleDetails[role];
    const Icon = details.icon;
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setLoading(true);
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, role })
            });
            const result = await response.json() as { message?: string; mustChangePassword?: boolean };
            if (!response.ok) {
                setError(result.message || "Unable to sign in. Please try again.");
                return;
            }
            const destination = result.mustChangePassword
                ? "/change-password"
                : role === "SUPER_ADMIN"
                    ? "/super-admin/dashboard"
                    : role === "FACULTY"
                        ? "/faculty/dashboard"
                        : "/student/dashboard";
            await router.replace(destination);
        } catch {
            setError("Sign in is temporarily unavailable. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
            <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
                <Link href="/login" className="text-sm font-semibold text-slate-500 hover:text-emerald-700">
                    ← All sign-in options
                </Link>
                <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">{details.title} sign in</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">{details.description}</p>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="mb-2 block text-sm font-bold text-slate-700">Institutional email</label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="username"
                            required
                            maxLength={254}
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="mb-2 block text-sm font-bold text-slate-700">Password</label>
                        <div className="relative">
                            <input
                                id="password"
                                type={visible ? "text" : "password"}
                                autoComplete="current-password"
                                required
                                maxLength={256}
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                            />
                            <button
                                type="button"
                                aria-label={visible ? "Hide password" : "Show password"}
                                onClick={() => setVisible(value => !value)}
                                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500"
                            >
                                {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-emerald-700 px-5 py-3.5 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Signing in..." : `Continue as ${details.title}`}
                    </button>
                </form>
                <p className="mt-6 text-xs leading-5 text-slate-500">
                    {role === "FACULTY"
                        ? "Faculty sign-in requires an account created by your institution administrator. A faculty profile by itself is not a login account."
                        : "If you cannot access your account, contact your institution administrator."}
                </p>
            </section>
        </main>
    );
}
