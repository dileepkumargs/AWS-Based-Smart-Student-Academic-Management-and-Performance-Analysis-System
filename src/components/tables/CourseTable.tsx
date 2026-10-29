import { Course } from "@/types/course";
import Link from "next/link";
import { ChevronRight, Bookmark } from "lucide-react";

interface Props {
    courses: Course[];
}

export default function CourseTable({ courses }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Code</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Credits</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Department</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Instructor</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {courses.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                No courses found in the catalog...
                            </td>
                        </tr>
                    ) : (
                        courses.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <Link
                                        href={`/courses/${c.id}`}
                                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors"
                                    >
                                        <Bookmark className="w-4 h-4 text-emerald-600/40" />
                                        {c.code}
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-slate-700">{c.name}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">{c.credits} CR</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-slate-500">{c.department}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-slate-500 italic">{c.instructor || "TBA"}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        href={`/courses/${c.id}`}
                                        className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                    >
                                        View Catalog
                                        <ChevronRight className="w-4 h-4" />
                                    </Link>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
