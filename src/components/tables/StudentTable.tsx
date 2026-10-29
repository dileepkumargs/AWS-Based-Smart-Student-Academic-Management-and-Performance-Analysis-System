import { Student } from "@/types/student";
import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";

interface Props {
    students: Student[];
}

export default function StudentTable({ students }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Year</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Course</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">GPA</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {students.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                No records match your criteria...
                            </td>
                        </tr>
                    ) : (
                        students.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <Link
                                        href={`/students/${s.id}`}
                                        className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors"
                                    >
                                        {s.name}
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{s.year}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-slate-500">{s.course}</span>
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`font-black ${s.gpa >= 3.5 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                        {s.gpa.toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        href={`/students/${s.id}`}
                                        className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                    >
                                        View Details
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
