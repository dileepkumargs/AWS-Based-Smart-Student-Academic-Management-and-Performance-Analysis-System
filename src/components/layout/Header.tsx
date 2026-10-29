import Link from "next/link";
import { useRouter } from "next/router";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function Header() {
    const router = useRouter();
    const { user, refresh } = useAuth();

    if (!user) return null;

    const links = user.role === "SUPER_ADMIN"
        ? [
            { name: "Overview", href: "/super-admin/dashboard" },
            { name: "Users", href: "/super-admin/users" },
            { name: "Students", href: "/students" },
            { name: "Courses", href: "/courses" },
            { name: "Faculty", href: "/faculty" },
            { name: "Enrollments", href: "/enrollments" }
        ]
        : user.role === "FACULTY"
            ? [
                { name: "Faculty Dashboard", href: "/faculty/dashboard" },
                { name: "My Students", href: "/students" },
                { name: "My Courses", href: "/courses" },
                { name: "Class Enrollments", href: "/enrollments" }
            ]
            : [{ name: "My Dashboard", href: "/student/dashboard" }];
    links.push({ name: "Password", href: "/change-password" });

    async function handleLogout() {
        try {
            const response = await fetch("/api/auth/logout", { method: "POST" });
            if (!response.ok) throw new Error("Logout request failed.");
            await refresh();
            await router.replace("/login");
        } catch (error) {
            console.error("Unable to end the current session:", error);
        }
    }

    return (
        <header className="sticky top-0 z-50 flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            <Link href={user.role === "STUDENT" ? "/student/dashboard" : user.role === "FACULTY" ? "/faculty/dashboard" : "/super-admin/dashboard"} className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:text-emerald-700">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-xl font-black text-white">A</span>
                <span className="hidden sm:inline">Academic Dashboard</span>
            </Link>
            <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600 sm:gap-6">
                {links.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={router.pathname === item.href ? "page" : undefined}
                        className="transition-colors hover:text-emerald-700"
                    >
                        {item.name}
                    </Link>
                ))}
                <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-5">
                    <span className="hidden max-w-36 truncate text-xs text-slate-500 md:inline" title={user.email}>
                        {user.displayName}
                    </span>
                    <button
                        type="button"
                        onClick={() => void handleLogout()}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-rose-50 hover:text-rose-700"
                    >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign out
                    </button>
                </div>
            </nav>
        </header>
    );
}
