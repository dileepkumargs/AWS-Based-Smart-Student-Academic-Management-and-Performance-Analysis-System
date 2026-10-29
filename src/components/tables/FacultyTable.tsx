import { Faculty } from "@/types/faculty";
import Link from "next/link";
import { Mail, Briefcase, ChevronRight, User } from "lucide-react";

interface Props {
    faculty: Faculty[];
}

export default function FacultyTable({ faculty }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Contact</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Department</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Specialization</th>
                        <th className="px-6 py-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {faculty.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                No faculty members found...
                            </td>
                        </tr>
                    ) : (
                        faculty.map((f) => (
                            <tr key={f.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <Link
                                        href={`/faculty/${f.id}`}
                                        className="flex items-center gap-3"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                                            {f.name}
                                        </span>
                                    </Link>
                                </td>
                                <td className="px-6 py-4">
                                    <a
                                        href={`mailto:${f.email}`}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors"
                                    >
                                        <Mail className="w-3.5 h-3.5" />
                                        {f.email}
                                    </a>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-black uppercase tracking-wider">
                                        <Briefcase className="w-3 h-3" />
                                        {f.department}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-slate-500">{f.specialization}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link
                                        href={`/faculty/${f.id}`}
                                        className="inline-flex items-center gap-2 text-xs font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                    >
                                        View Profile
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
