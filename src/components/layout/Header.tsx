import Link from "next/link";
import { cn } from "@/lib/utils";

export default function Header() {
    return (
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white sticky top-0 z-50">
            <Link href="/" className="text-lg font-bold text-slate-900 hover:text-emerald-600 transition-colors flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-xl">A</div>
                Academic Dashboard
            </Link>
            <nav className="flex items-center gap-8 text-sm font-semibold text-slate-600">
                {[
                    { name: 'Students', href: '/students' },
                    { name: 'Courses', href: '/courses' },
                    { name: 'Faculty', href: '/faculty' },
                    { name: 'Enrollments', href: '/enrollments' },
                ].map((item) => (
                    <Link
                        key={item.name}
                        href={item.href}
                        className="hover:text-emerald-600 transition-colors duration-200"
                    >
                        {item.name}
                    </Link>
                ))}
                <Link
                    href="/faculty/dashboard"
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-full hover:bg-emerald-700 transition-all duration-300 shadow-sm hover:shadow-emerald-200 hover:shadow-lg font-bold text-xs uppercase tracking-wider"
                >
                    Faculty Portal
                </Link>
            </nav>
        </header>
    );
}
