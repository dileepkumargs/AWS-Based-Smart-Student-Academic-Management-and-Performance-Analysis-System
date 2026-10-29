import { getDB } from "@/lib/mock-db";
import { toast } from "react-hot-toast";
import { GetServerSideProps } from "next";
import { useState } from "react";
import { useRouter } from "next/router";
import { Faculty } from "@/types/faculty";
import { FacultyService } from "@/services/faculty.service";
import { FacultyFormData } from "@/lib/validators";
import FacultyForm from "@/components/forms/FacultyForm";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";
import DetailLayout from "@/components/layout/DetailLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { UserCheck, Mail, Phone, MapPin, Briefcase, Award, Trash2, Edit3, ShieldCheck, User } from "lucide-react";
import Link from "next/link";

interface Props {
    faculty: Faculty | null;
    error?: string;
}

export default function FacultyDetailPage({ faculty, error }: Props) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    if (error || !faculty) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <Card className="max-w-md w-full text-center p-8 space-y-6">
                    <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center mx-auto text-rose-600">
                        <UserCheck className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Faculty Not Found</h1>
                        <p className="text-slate-500 font-medium mt-2">{error || "The personnel record you are looking for does not exist."}</p>
                    </div>
                    <Link
                        href="/faculty"
                        className="block w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        Return to Personnel
                    </Link>
                </Card>
            </div>
        );
    }

    const handleUpdate = async (data: FacultyFormData) => {
        try {
            await FacultyService.update(faculty.id, data);
            toast.success("Faculty profile updated!");
            setIsEditing(false);
            router.replace(router.asPath);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update profile.");
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await FacultyService.delete(faculty.id);
            toast.success("Faculty member deleted.");
            router.push("/faculty");
        } catch (error) {
            setIsDeleting(false);
            toast.error("Failed to delete faculty member");
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
                Terminate
            </button>
        </>
    );

    return (
        <DetailLayout
            title={faculty.name}
            subtitle={`${faculty.department} Department — Principal Consultant`}
            badge="Faculty Member"
            icon={UserCheck}
            backHref="/faculty"
            backLabel="Faculty Directory"
            actions={!isEditing ? actions : null}
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Professional Info */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Status Brief */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                                <Briefcase className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Department</p>
                                <p className="text-xl font-black text-slate-900 mt-0.5">{faculty.department}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl hover:shadow-emerald-500/5 transition-all">
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                                <Award className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Specialization</p>
                                <p className="text-xl font-black text-slate-900 mt-0.5 truncate max-w-[200px]">{faculty.specialization}</p>
                            </div>
                        </div>
                    </div>

                    {isEditing ? (
                        <Card className="rounded-[2rem]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <Edit3 className="w-5 h-5 text-emerald-600" />
                                    Modify Faculty Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <FacultyForm
                                    onSubmit={handleUpdate}
                                    defaultValues={faculty}
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
                        <div className="space-y-8">
                            <Card className="rounded-[2rem] overflow-hidden">
                                <CardHeader className="bg-slate-50/50 flex flex-row items-center justify-between py-6">
                                    <div className="flex items-center gap-3">
                                        <Mail className="w-6 h-6 text-emerald-600" />
                                        <div className="space-y-0.5">
                                            <CardTitle>Communication Portal</CardTitle>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Contact Methods</p>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Electronic Mail</p>
                                            <a href={`mailto:${faculty.email}`} className="text-lg font-bold text-slate-900 hover:text-emerald-600 transition-colors">
                                                {faculty.email}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Direct Line</p>
                                            <p className="text-lg font-bold text-slate-900">{faculty.phone}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 md:col-span-2">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Office Location</p>
                                            <p className="text-lg font-bold text-slate-900">Academic Wing B, Level 4, Suite 402</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="bg-emerald-900/5 border border-emerald-100 rounded-[2.5rem] p-8 flex items-center gap-8">
                                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20 text-white">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Verified Educator</h3>
                                    <p className="text-slate-500 font-medium mt-1 leading-relaxed">
                                        This faculty member has cleared all institutional credentials and is authorized for academic consultation and curriculum management.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Identity Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="rounded-[2.5rem] bg-white border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-emerald-700" />
                        <CardHeader className="pt-10 flex flex-col items-center">
                            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mb-6 border-4 border-white shadow-lg overflow-hidden relative group">
                                <User className="w-12 h-12 group-hover:scale-110 transition-transform" />
                            </div>
                            <CardTitle className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Personnel File</CardTitle>
                            <div className="text-2xl font-black text-slate-900 tracking-tight text-center">Identity Overview</div>
                        </CardHeader>
                        <CardContent className="space-y-8 pb-10">
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Faculty ID</p>
                                    <p className="font-black text-slate-900 text-xl tracking-tight">#F-{faculty.id.toString().padStart(4, '0')}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Employment Status</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        <p className="font-bold text-slate-900 text-lg tracking-tight">Active Duty</p>
                                    </div>
                                </div>
                                <div className="h-px bg-slate-100" />
                                <div className="space-y-3">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Departmental Influence</p>
                                    <div className="flex items-center gap-4">
                                        <div className="text-4xl font-black text-slate-900">Tier 1</div>
                                        <div className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">High Seniority</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden group">
                        <UserCheck className="absolute -right-8 -bottom-8 w-40 h-40 opacity-5 group-hover:scale-110 transition-transform duration-700" />
                        <h3 className="text-xl font-black tracking-tight mb-4">Official Bio</h3>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium">
                            Principal consultant and academic lead for the {faculty.department} department. Specializing in {faculty.specialization} with over a decade of administrative excellence.
                        </p>
                    </div>
                </div>
            </div>

            <DeleteConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Service Termination"
                message={`Are you sure you want to terminate ${faculty.name}'s active service record? This protocol will archive all associated professional metadata.`}
                isLoading={isDeleting}
            />
        </DetailLayout>
    );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
    const { id } = context.params!;
    const db = getDB();
    const facultyId = Number(id);

    const faculty = db.faculty.find(f => f.id === facultyId);

    if (!faculty) {
        return {
            props: {
                faculty: null,
                error: "Faculty member not found"
            }
        };
    }

    return {
        props: { faculty }
    };
};
