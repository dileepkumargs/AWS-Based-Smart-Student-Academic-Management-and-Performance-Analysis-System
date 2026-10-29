import { useState, useEffect } from "react";
import { Filter, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
    onFilterChange: (filters: { department?: string }) => void;
    departments: string[];
}

export default function FacultyFilters({ onFilterChange, departments }: Props) {
    const [department, setDepartment] = useState<string>("");

    useEffect(() => {
        onFilterChange({
            department: department || undefined
        });
    }, [department]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Department View
                    </label>
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all"
                    >
                        <option value="">All Departments</option>
                        {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                        ))}
                    </select>
                </div>
            </div>

            {department && (
                <button
                    onClick={() => {
                        setDepartment("");
                    }}
                    className="w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 bg-rose-50 py-3 rounded-xl transition-colors border border-rose-100"
                >
                    <X className="w-3 h-3" />
                    Reset Selection
                </button>
            )}
        </div>
    );
}
