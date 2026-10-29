import { getDB } from "@/lib/mock-db";
import { toast } from "react-hot-toast";
import { GetServerSideProps } from "next";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Course } from "@/types/course";
import { EnrollmentWithDetails } from "@/types/enrollment";
import { CourseService } from "@/services/course.service";
import { EnrollmentService } from "@/services/enrollment.service";
import { CourseFormData } from "@/lib/validators";
import CourseForm from "@/components/forms/CourseForm";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import DetailLayout from "@/components/layout/DetailLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { BookOpen, Users, CheckCircle2, Clock, Trash2, Edit3, Briefcase, Bookmark, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Props {
    course: Course | null;
    error?: string;
}

export default function CourseDetailPage({ course, error }: Props) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(true);

    useEffect(() => {
        if (course) {
            fetchEnrollments();
        }
    }, [course]);

    const fetchEnrollments = async () => {
        try {
            const data = await EnrollmentService.getByCourse(course!.id);
            setEnrollments(data);
        } catch (error) {
            console.error("Failed to fetch enrollments:", error);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    if (error || !course) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center p-8 space-y-6">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-600">
                        <BookOpen className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Course Not Found</h1>
                        <p className="text-slate-500 font-medium mt-2">{error || "The catalog entry you are looking for does not exist."}</p>
                    </div>
                    <Link
                        href="/courses"
                        className="block w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        Return to Catalog
                    </Link>
                </Card>
            </div>
        );
    }

    const handleUpdate = async (data: CourseFormData) => {
        try {
            await CourseService.update(course.id, data);
            toast.success("Course details updated!");
            setIsEditing(false);
            router.replace(router.asPath);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update course.");
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await CourseService.delete(course.id);
            toast.success("Course removed from catalog.");
            router.push("/courses");
        } catch (error) {
            setIsDeleting(false);
            toast.error("Failed to delete course");
        }
    };

    const actions = (
        <>
            <button
                onClick={() => setIsEditing(true)}
                className="bg-white/10 text-white px-5 py-2.5 rounded-xl hover:bg-white/20 transition-all font-bold text-sm backdrop-blur-md border border-white/20 flex items-center gap-2"
            >
                <Edit3 className="w-4 h-4" />
                Edit Catalog
            </button>
            <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-rose-500 text-white px-5 py-2.5 rounded-xl hover:bg-rose-600 transition-all font-bold text-sm shadow-xl shadow-rose-500/20 flex items-center gap-2"
            >
                <Trash2 className="w-4 h-4" />
                Delete
            </button>
        </>
    );

    return (
        <DetailLayout
            title={course.name}
            subtitle={`${course.code} — Department of ${course.department}`}
            badge="Course Catalog"
            icon={BookOpen}
            backHref="/courses"
            backLabel="Course Catalog"
            actions={!isEditing ? actions : null}
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Stats and Info */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total Enrolled</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">{enrollments.length}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Completed</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">
                                    {enrollments.filter(e => e.status === 'completed').length}
                                </p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Active Learners</p>
                                <p className="text-3xl font-black text-slate-900 mt-1">
                                    {enrollments.filter(e => e.status === 'enrolled').length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {isEditing ? (
                        <Card className="rounded-[2rem]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <Edit3 className="w-5 h-5 text-emerald-600" />
                                    Modify Catalog Entry
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CourseForm
                                    onSubmit={handleUpdate}
                                    defaultValues={course}
                                />
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="mt-6 text-slate-400 hover:text-slate-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2"
                                >
                                    Cancel Changes
                                </button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="rounded-[2rem] overflow-hidden">
                            <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-6">
                                <div className="flex items-center gap-3">
                                    <Users className="w-6 h-6 text-emerald-600" />
                                    <div className="space-y-0.5">
                                        <CardTitle>Enrolled Students</CardTitle>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Class Roster</p>
                                    </div>
                                </div>
                                <Link
                                    href={`/enrollments?courseId=${course.id}`}
                                    className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg"
                                >
                                    Manage Roster
                                </Link>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingEnrollments ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Retrieving Roster...</p>
                                    </div>
                                ) : enrollments.length === 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
                                            <Bookmark className="w-8 h-8" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No student registrations found</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50/30 border-b border-slate-100">
                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Identify</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Terms</th>
                                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Grade</th>
                                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {enrollments.map((enrollment) => (
                                                    <tr key={enrollment.id} className="hover:bg-slate-50/30 transition-colors group">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                                    <User className="w-4 h-4" />
                                                                </div>
                                                                <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                                                    {enrollment.studentName}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-700">{enrollment.semester}</span>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{enrollment.year}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            {enrollment.grade ? (
                                                                <span className={cn(
                                                                    "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest border",
                                                                    enrollment.grade === 'A' || enrollment.grade === 'A-' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                        enrollment.grade.startsWith('B') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                                            enrollment.grade.startsWith('C') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                                'bg-rose-50 text-rose-700 border-rose-200'
                                                                )}>
                                                                    {enrollment.grade}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest italic">Pending</span>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6 text-right">
                                                            <span className={cn(
                                                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                                enrollment.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                                    enrollment.status === 'enrolled' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-slate-100 text-slate-800'
                                                            )}>
                                                                {enrollment.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Side: Information Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="rounded-[2.5rem] bg-white border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-emerald-700" />
                        <CardHeader className="pt-10">
                            <CardTitle className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Subject Metadata</CardTitle>
                            <div className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Catalog Details</div>
                        </CardHeader>
                        <CardContent className="space-y-8 pb-10">
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Course Code</p>
                                    <p className="font-black text-slate-900 text-xl tracking-tight">{course.code}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Credit Unit Value</p>
                                    <p className="font-bold text-slate-900 text-xl tracking-tight">{course.credits} Credits</p>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div className="space-y-3">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Assigned Instructor</p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <User className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 text-lg tracking-tight leading-tight">
                                                {course.instructor || "To Be Assigned"}
                                            </p>
                                            {course.instructor && (
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">Verified Faculty</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
                                <div className="flex items-center gap-3">
                                    <Briefcase className="w-5 h-5 text-emerald-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-emerald-400">Department Status</span>
                                </div>
                                <p className="text-xs font-medium leading-relaxed opacity-80">
                                    This course is a primary constituent of the **{course.department}** curriculum for the current academic year.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="De-catalog Course"
                message={`Are you sure you want to remove ${course.code}: ${course.name} from the active catalog? This will archive all associated enrollment sessions.`}
                isLoading={isDeleting}
            />
        </DetailLayout>
    );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
    const { id } = context.params!;
    const db = getDB();
    const courseId = Number(id);

    const course = db.courses.find(c => c.id === courseId);

    if (!course) {
        return {
            props: {
                course: null,
                error: "Course not found"
            }
        };
    }

    return {
        props: { course }
    };
};
