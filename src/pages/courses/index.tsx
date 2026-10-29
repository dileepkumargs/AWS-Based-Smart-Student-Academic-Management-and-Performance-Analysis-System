import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import CourseTable from "@/components/tables/CourseTable";
import CourseForm from "@/components/forms/CourseForm";
import CourseFilters from "@/components/filters/CourseFilters";
import { Course } from "@/types/course";
import { CourseService } from "@/services/course.service";
import { CourseFormData } from "@/lib/validators";
import { exportCoursesToCSV } from "@/lib/csv-utils";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Search, FileDown, Plus, BookOpen } from "lucide-react";

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<{ department?: string; credits?: number }>({});
    const [loading, setLoading] = useState(false);
    const [allCourses, setAllCourses] = useState<Course[]>([]);

    const limit = 5;

    useEffect(() => {
        fetchCourses();
        fetchAllCourses();
    }, [page, search, filters]);

    async function fetchCourses() {
        setLoading(true);
        try {
            const res = await CourseService.list({
                page,
                limit,
                search,
                ...filters
            });
            setCourses(res.data);
            setTotal(res.meta.total);
        } catch (error) {
            console.error("Failed to fetch courses:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchAllCourses() {
        try {
            const res = await CourseService.list({
                page: 1,
                limit: 1000,
                search
            });
            setAllCourses(res.data);
        } catch (error) {
            console.error("Failed to fetch all courses:", error);
        }
    }

    async function handleCreateCourse(data: CourseFormData) {
        try {
            await CourseService.create(data);
            toast.success("Course added successfully!");
            setPage(1);
            fetchCourses();
            fetchAllCourses();
        } catch (error) {
            console.error(error);
            toast.error("Failed to add course.");
        }
    }

    function handleExportCSV() {
        exportCoursesToCSV(allCourses);
    }

    const totalPages = Math.ceil(total / limit);

    const departments = useMemo(() => {
        return Array.from(new Set(allCourses.map(c => c.department))).sort();
    }, [allCourses]);

    async function handleFilterChange(newFilters: { department?: string; credits?: number }) {
        setFilters(newFilters);
        setPage(1);
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="w-10 h-10 text-emerald-600" />
                        Courses
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Curriculum and academic offerings catalog</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={handleExportCSV}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-bold text-sm shadow-sm"
                    >
                        <FileDown className="w-4 h-4 text-emerald-600" />
                        Export
                    </button>
                    <CourseForm onSubmit={handleCreateCourse} />
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
                            <CourseFilters
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
                                    placeholder="Search by code or name..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all font-medium"
                                    value={search}
                                    onChange={(e) => {
                                        setPage(1);
                                        setSearch(e.target.value);
                                    }}
                                />
                            </div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {total} Total Courses
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching Catalog...</p>
                                </div>
                            ) : (
                                <CourseTable courses={courses} />
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
