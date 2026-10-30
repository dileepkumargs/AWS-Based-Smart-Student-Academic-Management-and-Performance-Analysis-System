import { useState, useEffect } from "react";
import { X, GraduationCap } from "lucide-react";
import { ENROLLMENT_BRANCHES } from "@/lib/enrollment-options";

interface Props {
    onFilterChange: (filters: { branch?: string; credits?: number }) => void;
}

export default function CourseFilters({ onFilterChange }: Props) {
    const [branch, setBranch] = useState<string>("");
    const [credits, setCredits] = useState<string>("");

    useEffect(() => {
        onFilterChange({
            branch: branch || undefined,
            credits: credits ? Number(credits) : undefined
        });
    }, [branch, credits, onFilterChange]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <GraduationCap className="w-3 h-3" />
                        Branch
                    </label>
                    <select
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all"
                    >
                        <option value="">All Branches</option>
                        {ENROLLMENT_BRANCHES.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <GraduationCap className="w-3 h-3" />
                        Credit Value
                    </label>
                    <select
                        value={credits}
                        onChange={(e) => setCredits(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all"
                    >
                        <option value="">All Credits</option>
                        {[1, 2, 3, 4, 5].map(c => (
                            <option key={c} value={c}>{c} Credits</option>
                        ))}
                    </select>
                </div>
            </div>

            {(branch || credits) && (
                <button
                    onClick={() => {
                        setBranch("");
                        setCredits("");
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
