import { useState, useEffect } from "react";
import { Filter, X, Calendar, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    onFilterChange: (filters: { year?: number; course?: string }) => void;
    departments: string[];
}

export default function StudentFilters({ onFilterChange, departments }: Props) {
    const [year, setYear] = useState<string>("");
    const [course, setCourse] = useState<string>("");

    useEffect(() => {
        onFilterChange({
            year: year ? Number(year) : undefined,
            course: course || undefined
        });
    }, [year, course]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Enrollment Year
                    </label>
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all"
                    >
                        <option value="">All Academic Years</option>
                        {[2021, 2022, 2023, 2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <BookOpen className="w-3 h-3" />
                        Department
                    </label>
                    <select
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {(year || course) && (
                <button
                    onClick={() => {
                        setYear("");
                        setCourse("");
                    }}
                    className="w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 bg-rose-50 py-3 rounded-xl transition-colors border border-rose-100"
                >
                    <X className="w-3 h-3" />
                    Reset Filters
                </button>
            )}
        </div>
    );
}
