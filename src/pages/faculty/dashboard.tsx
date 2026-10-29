import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Faculty } from "@/types/faculty";
import { Course } from "@/types/course";
import { EnrollmentWithDetails } from "@/types/enrollment";
import { FacultyService } from "@/services/faculty.service";
import { CourseService } from "@/services/course.service";
import { EnrollmentService } from "@/services/enrollment.service";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Users, BookOpen, GraduationCap, FlaskConical, CheckCircle2, ChevronRight, UserCircle, LayoutDashboard, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FacultyDashboard() {
    const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
    const [myCourses, setMyCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [courseEnrollments, setCourseEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [updatingGrade, setUpdatingGrade] = useState<{ id: number, grade: string } | null>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    async function fetchInitialData() {
        try {
            const res = await FacultyService.list({ page: 1, limit: 100 });
            setAllFaculty(res.data);
            if (res.data.length > 0) {
                setSelectedFaculty(res.data[0]);
            }
        } catch (error) {
            console.error("Failed to fetch faculty:", error);
        }
    }

    useEffect(() => {
        if (selectedFaculty) {
            fetchMyCourses();
            setSelectedCourse(null);
            setCourseEnrollments([]);
        }
    }, [selectedFaculty]);

    async function fetchMyCourses() {
        setLoading(true);
        try {
            const res = await CourseService.list({ page: 1, limit: 1000 });
            const filtered = res.data.filter(c => c.instructor === selectedFaculty?.name);
            setMyCourses(filtered);
        } catch (error) {
            console.error("Failed to fetch my courses:", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (selectedCourse) {
            fetchCourseEnrollments();
        }
    }, [selectedCourse]);

    async function fetchCourseEnrollments() {
        try {
            const data = await EnrollmentService.getByCourse(selectedCourse!.id);
            setCourseEnrollments(data);
        } catch (error) {
            console.error("Failed to fetch course enrollments:", error);
        }
    }

    async function handleGradeUpdate(enrollmentId: number, grade: string) {
        try {
            await EnrollmentService.update(enrollmentId, { grade, status: 'completed' });
            toast.success("Grade updated successfully!");
            fetchCourseEnrollments();
            setUpdatingGrade(null);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update grade");
        }
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8">
            {/* Simulation Header */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <FlaskConical className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-500/30 flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            Faculty Simulation
                        </div>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight">Management Portal</h1>
                        <p className="text-slate-400 font-medium mt-1 max-w-xl text-sm italic">
                            Experience the institution from any staff member's perspective. View assigned courses and manage student grades.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-4">
                        <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-md rounded-2xl p-3 border border-slate-700/50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2">Simulate As:</span>
                            <select
                                value={selectedFaculty?.id || ""}
                                onChange={(e) => {
                                    const faculty = allFaculty.find(f => f.id === Number(e.target.value));
                                    setSelectedFaculty(faculty || null);
                                }}
                                className="bg-slate-800 border-none rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer min-w-[240px]"
                            >
                                {allFaculty.map(f => (
                                    <option key={f.id} value={f.id}>{f.name} — {f.department}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {selectedFaculty && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Sidebar: My Courses */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                    <LayoutDashboard className="w-6 h-6 text-emerald-600" />
                                    Active Assignments
                                </h2>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                                    {myCourses.length}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
                                    ))
                                ) : myCourses.length === 0 ? (
                                    <Card className="border-dashed bg-transparent border-slate-200">
                                        <CardContent className="py-12 flex flex-col items-center text-center">
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No assigned courses</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    myCourses.map(course => (
                                        <button
                                            key={course.id}
                                            onClick={() => setSelectedCourse(course)}
                                            className={cn(
                                                "w-full text-left p-6 rounded-2xl border transition-all duration-300 relative group",
                                                selectedCourse?.id === course.id
                                                    ? "bg-white border-emerald-500 shadow-xl shadow-emerald-500/10"
                                                    : "bg-white border-slate-100 hover:border-slate-300 shadow-sm"
                                            )}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center justify-between w-full">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{course.code}</span>
                                                    <ChevronRight className={cn("w-4 h-4 transition-transform", selectedCourse?.id === course.id ? "rotate-90 text-emerald-600" : "text-slate-300 group-hover:translate-x-1")} />
                                                </div>
                                                <span className={cn("font-bold text-slate-900 group-hover:text-emerald-600 transition-colors block mt-1", selectedCourse?.id === course.id && "text-emerald-600")}>
                                                    {course.name}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Summary Widget */}
                        <Card className="bg-slate-900 border-none rounded-[2rem] overflow-hidden group">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em]">Faculty Insight</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <div className="text-white text-3xl font-black tracking-tight">{selectedFaculty.name}</div>
                                    <div className="text-slate-400 font-medium text-sm mt-1">{selectedFaculty.department} Department</div>
                                </div>
                                <div className="h-px bg-slate-800" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Total Classes</div>
                                        <div className="text-white text-2xl font-black">{myCourses.length}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Status</div>
                                        <div className="text-emerald-400 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Active
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content: Grade Management */}
                    <div className="lg:col-span-8">
                        {selectedCourse ? (
                            <Card className="overflow-hidden shadow-2xl shadow-slate-200/50">
                                <CardHeader className="bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 py-8 px-10">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="w-6 h-6 text-emerald-600" />
                                            <CardTitle className="text-2xl font-black text-slate-900">{selectedCourse.code}: {selectedCourse.name}</CardTitle>
                                        </div>
                                        <CardDescription className="font-bold text-slate-400 uppercase tracking-widest text-xs">
                                            Academic Grading Ledger — {courseEnrollments.length} Active Records
                                        </CardDescription>
                                    </div>
                                </CardHeader>

                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Information</th>
                                                    <th className="px-10 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Terms</th>
                                                    <th className="px-10 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Evaluation</th>
                                                    <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {courseEnrollments.map(enrollment => (
                                                    <tr key={enrollment.id} className="hover:bg-slate-50/30 transition-colors group">
                                                        <td className="px-10 py-6">
                                                            <Link href={`/students/${enrollment.studentId}`} className="group/link block">
                                                                <span className="font-bold text-slate-900 group-hover/link:text-emerald-600 transition-colors block">
                                                                    {enrollment.studentName}
                                                                </span>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: #{enrollment.studentId}</span>
                                                            </Link>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-700">{enrollment.semester}</span>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{enrollment.year} Academic Year</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            {updatingGrade?.id === enrollment.id ? (
                                                                <div className="flex items-center gap-2 justify-center">
                                                                    <select
                                                                        autoFocus
                                                                        value={updatingGrade.grade}
                                                                        onChange={(e) => setUpdatingGrade({ ...updatingGrade, grade: e.target.value })}
                                                                        className="bg-white border-2 border-emerald-500 rounded-xl px-3 py-1.5 text-sm font-black focus:ring-4 focus:ring-emerald-500/10 outline-none shadow-lg"
                                                                    >
                                                                        <option value="">Grade</option>
                                                                        {['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'].map(g => (
                                                                            <option key={g} value={g}>{g}</option>
                                                                        ))}
                                                                    </select>
                                                                    <button
                                                                        onClick={() => handleGradeUpdate(enrollment.id, updatingGrade.grade)}
                                                                        className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                                                                    >
                                                                        <CheckCircle2 className="w-5 h-5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <span className={cn(
                                                                        "px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
                                                                        enrollment.grade === 'A' || enrollment.grade === 'A-' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                            enrollment.grade?.startsWith('B') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                                enrollment.grade?.startsWith('C') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                                    enrollment.grade ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                                        'bg-slate-50 text-slate-400 border-slate-200'
                                                                    )}>
                                                                        {enrollment.grade || 'Pending'}
                                                                    </span>
                                                                    <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">{enrollment.status}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-10 py-6 text-right">
                                                            <button
                                                                onClick={() => setUpdatingGrade({ id: enrollment.id, grade: enrollment.grade || "" })}
                                                                disabled={updatingGrade !== null}
                                                                className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 disabled:opacity-0"
                                                            >
                                                                Update Records
                                                                <ChevronRight className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {courseEnrollments.length === 0 && (
                                        <div className="py-24 text-center">
                                            <Search className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No students enrolled in this catalog entry</p>
                                        </div>
                                    )}
                                </CardContent>
                                <div className="bg-slate-50/50 px-10 py-8 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                            Systems Synchronized
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                            &copy; Institutional Ledger v4.0.2
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <div className="h-full bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-20 text-center">
                                <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center border border-slate-100 shadow-xl shadow-slate-200/50 mb-8">
                                    <FlaskConical className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Simulator Standby</h3>
                                <p className="text-slate-500 font-medium mt-3 max-w-sm mx-auto leading-relaxed">
                                    The simulation engine is ready. Please select an active assignment from the sidebar to initialize the grading environment.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
