import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import FacultyTable from "@/components/tables/FacultyTable";
import FacultyForm from "@/components/forms/FacultyForm";
import FacultyFilters from "@/components/filters/FacultyFilters";
import { Faculty } from "@/types/faculty";
import { FacultyService } from "@/services/faculty.service";
import { FacultyFormData } from "@/lib/validators";
import { exportFacultyToCSV } from "@/lib/csv-utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Search, FileDown, Plus, GraduationCap } from "lucide-react";

export default function FacultyPage() {
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<{ department?: string }>({});
    const [loading, setLoading] = useState(false);
    const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);

    const limit = 5;

    useEffect(() => {
        fetchFaculty();
        fetchAllFaculty();
    }, [page, search, filters]);

    async function fetchFaculty() {
        setLoading(true);
        try {
            const res = await FacultyService.list({
                page,
                limit,
                search,
                ...filters
            });
            setFaculty(res.data);
            setTotal(res.meta.total);
        } catch (error) {
            console.error("Failed to fetch faculty:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchAllFaculty() {
        try {
            const res = await FacultyService.list({
                page: 1,
                limit: 1000,
                search
            });
            setAllFaculty(res.data);
        } catch (error) {
            console.error("Failed to fetch all faculty:", error);
        }
    }

    async function handleCreateFaculty(data: FacultyFormData) {
        try {
            await FacultyService.create(data);
            toast.success("Faculty member added successfully!");
            setPage(1);
            fetchFaculty();
            fetchAllFaculty();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add faculty member.");
        }
    }

    function handleExportCSV() {
        exportFacultyToCSV(allFaculty);
    }

    const totalPages = Math.ceil(total / limit);

    const departments = useMemo(() => {
        return Array.from(new Set(allFaculty.map(f => f.department))).sort();
    }, [allFaculty]);

    async function handleFilterChange(newFilters: { department?: string }) {
        setFilters(newFilters);
        setPage(1);
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <GraduationCap className="w-10 h-10 text-emerald-600" />
                        Faculty
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Manage academic staff and department heads</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={handleExportCSV}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"
                    >
                        <FileDown className="w-4 h-4 text-emerald-600" />
                        Export
                    </button>
                    <FacultyForm onSubmit={handleCreateFaculty} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Advanced Filters Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Advanced Filters</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FacultyFilters
                                onFilterChange={handleFilterChange}
                                departments={departments}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Main Table Area */}
                <div className="lg:col-span-9 space-y-6">
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 py-6">
                            <div className="relative w-full md:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email or specialization..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all font-medium"
                                    value={search}
                                    onChange={(e) => {
                                        setPage(1);
                                        setSearch(e.target.value);
                                    }}
                                />
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {total} Total Staff
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Faculty...</p>
                                </div>
                            ) : (
                                <FacultyTable faculty={faculty} />
                            )}
                        </CardContent>

                        {/* Pagination Footer */}
                        {!loading && totalPages > 0 && (
                            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage((p) => p - 1)}
                                        className="h-9 px-4 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase tracking-wider shadow-sm"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        disabled={page === totalPages}
                                        onClick={() => setPage((p) => p + 1)}
                                        className="h-9 px-4 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase tracking-wider shadow-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                    Page {page} of {totalPages}
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
