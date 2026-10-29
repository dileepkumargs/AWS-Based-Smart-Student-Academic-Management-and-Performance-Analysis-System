import { getDB } from "@/lib/mock-db";
import { toast } from "react-hot-toast";
import { GetServerSideProps } from "next";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Student } from "@/types/student";
import { EnrollmentWithDetails } from "@/types/enrollment";
import { StudentService } from "@/services/student.service";
import { EnrollmentService } from "@/services/enrollment.service";
import { StudentFormData } from "@/lib/validators";
import StudentForm from "@/components/forms/StudentForm";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import DetailLayout from "@/components/layout/DetailLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Users, GraduationCap, CheckCircle2, Clock, Trash2, Edit3, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Props {
    student: Student | null;
    error?: string;
}

export default function StudentDetailPage({ student, error }: Props) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(true);

    useEffect(() => {
        if (student) {
            fetchEnrollments();
        }
    }, [student]);

    const fetchEnrollments = async () => {
        try {
            const data = await EnrollmentService.getByStudent(student!.id);
            setEnrollments(data);
        } catch (error) {
            console.error("Failed to fetch enrollments:", error);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    if (error || !student) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center p-8 space-y-6">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-600">
                        <Users className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Not Found</h1>
                        <p className="text-slate-500 font-medium mt-2">{error || "The record you are looking for does not exist."}</p>
                    </div>
                    <Link
                        href="/students"
                        className="block w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        Return to Database
                    </Link>
                </Card>
            </div>
        );
    }

    const handleUpdate = async (data: StudentFormData) => {
        try {
            await StudentService.update(student.id, data);
            toast.success("Student profile updated successfully!");
            setIsEditing(false);
            router.replace(router.asPath);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update student profile.");
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await StudentService.delete(student.id);
            toast.success("Student deleted successfully!");
            router.push("/students");
        } catch (error) {
            setIsDeleting(false);
            toast.error("Failed to delete student");
        }
    };

    const actions = (
        <>
            <button
                onClick={() => setIsEditing(true)}
                className="bg-white/10 text-white px-5 py-2.5 rounded-xl hover:bg-white/20 transition-all font-bold text-sm backdrop-blur-md border border-white/20 flex items-center gap-2"
            >
                <Edit3 className="w-4 h-4" />
                Edit Profile
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
            title={student.name}
            subtitle={`Academic Profile — ${student.course}`}
            badge="Student Record"
            icon={Users}
            backHref="/students"
            backLabel="Students Database"
            actions={!isEditing ? actions : null}
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Stats and Info */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Enrolled Courses</p>
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
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Current Semester</p>
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
                                    Modify Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StudentForm
                                    onSubmit={handleUpdate}
                                    defaultValues={student}
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
                                    <GraduationCap className="w-6 h-6 text-emerald-600" />
                                    <div className="space-y-0.5">
                                        <CardTitle>Enrollment History</CardTitle>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Academic Transcript</p>
                                    </div>
                                </div>
                                <Link
                                    href={`/enrollments?studentId=${student.id}`}
                                    className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg"
                                >
                                    Manage Registry
                                </Link>
                            </CardHeader>
                            <CardContent className="p-0">
                                {loadingEnrollments ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                        <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Compiling Transcript...</p>
                                    </div>
                                ) : enrollments.length === 0 ? (
                                    <div className="py-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-200">
                                            <BookOpen className="w-8 h-8" />
                                        </div>
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active registrations found</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-slate-50/30 border-b border-slate-100">
                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Catalog Entry</th>
                                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Terms</th>
                                                    <th className="px-8 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Grade</th>
                                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {enrollments.map((enrollment) => (
                                                    <tr key={enrollment.id} className="hover:bg-slate-50/30 transition-colors group">
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                                                    {enrollment.courseCode}
                                                                </span>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{enrollment.courseName}</span>
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
                            <CardTitle className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Metadata Archive</CardTitle>
                            <div className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Registry Details</div>
                        </CardHeader>
                        <CardContent className="space-y-8 pb-10">
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Internal Identifier</p>
                                    <p className="font-black text-slate-900 text-xl tracking-tight">#{student.id.toString().padStart(6, '0')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Registration Year</p>
                                    <p className="font-bold text-slate-900 text-xl tracking-tight">{student.year} Academic Cycle</p>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div className="space-y-3">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Institutional Standing</p>
                                    <div className="flex items-center gap-4">
                                        <div className="text-4xl font-black text-slate-900">{student.gpa.toFixed(2)}</div>
                                        <div className={cn(
                                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                            student.gpa >= 3.5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                student.gpa >= 3.0 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    student.gpa >= 2.5 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                        'bg-rose-50 text-rose-700 border-rose-200'
                                        )}>
                                            {student.gpa >= 3.5 ? 'Exceptional' :
                                                student.gpa >= 3.0 ? 'Meritorious' :
                                                    student.gpa >= 2.5 ? 'Standard' : 'Probation'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-emerald-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60 text-emerald-400">Identity Verified</span>
                                </div>
                                <p className="text-xs font-medium leading-relaxed opacity-80">
                                    This record is authorized. All academic metrics are verified and synchronized with the central repository.
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
                title="Archive Student Record"
                message={`Are you sure you want to archive ${student.name}'s profile? This protocol is irreversible and will remove all associated registry entries.`}
                isLoading={isDeleting}
            />
        </DetailLayout>
    );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
    const { id } = context.params!;
    const db = getDB();
    const studentId = Number(id);

    const student = db.students.find(s => s.id === studentId);

    if (!student) {
        return {
            props: {
                student: null,
                error: "Student not found"
            }
        };
    }

    return {
        props: { student }
    };
};


