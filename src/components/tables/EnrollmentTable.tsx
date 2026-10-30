import { EnrollmentWithDetails } from "@/types/enrollment";
import { getStudyYearLabel } from "@/lib/enrollment-options";

interface Props {
    enrollments: EnrollmentWithDetails[];
    onView: (enrollment: EnrollmentWithDetails) => void;
    onEdit?: (enrollment: EnrollmentWithDetails) => void;
    canEdit?: (enrollment: EnrollmentWithDetails) => boolean;
    onDelete?: (id: number) => void;
}

const gradeColors: Record<string, string> = {
    'A': 'bg-green-100 text-green-800 border-green-300',
    'A-': 'bg-green-100 text-green-700 border-green-300',
    'B+': 'bg-blue-100 text-blue-800 border-blue-300',
    'B': 'bg-blue-100 text-blue-700 border-blue-300',
    'B-': 'bg-blue-100 text-blue-600 border-blue-300',
    'C+': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'C': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'C-': 'bg-yellow-100 text-yellow-600 border-yellow-300',
    'D': 'bg-orange-100 text-orange-800 border-orange-300',
    'F': 'bg-red-100 text-red-800 border-red-300'
};

const statusColors: Record<string, string> = {
    'enrolled': 'bg-blue-100 text-blue-800 border-blue-300',
    'completed': 'bg-green-100 text-green-800 border-green-300',
    'dropped': 'bg-gray-100 text-gray-800 border-gray-300'
};

export default function EnrollmentTable({ enrollments, onView, onEdit, canEdit, onDelete }: Props) {
    if (enrollments.length === 0) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-md">
                <div className="flex flex-col items-center">
                    <div className="mb-3 rounded-full bg-purple-100 p-4">
                        <svg className="h-10 w-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="mb-1 text-lg font-semibold text-gray-800">No Enrollments Found</h3>
                    <p className="text-sm text-gray-600">Start by creating a new enrollment above</p>
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="overscroll-x-contain overflow-x-auto">
                <table className="w-full min-w-[1120px] border-collapse text-xs">
                    <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                        <tr>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Student Name</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">USN / Student ID</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Branch</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Year of Study</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Email</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Semester</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Academic Year</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Grade</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Status</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide">Enrolled Date</th>
                            <th className="whitespace-nowrap px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {enrollments.map((enrollment, index) => (
                            <tr
                                key={enrollment.id}
                                className={`hover:bg-purple-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            >
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">
                                    <span className="block max-w-36 truncate" title={enrollment.studentName}>
                                        {enrollment.studentName || `Student #${enrollment.studentId}`}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">#{enrollment.studentId}</td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">{enrollment.branch}</td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">
                                    {enrollment.studyYear === null
                                        ? "Not recorded"
                                        : getStudyYearLabel(enrollment.studyYear)}
                                </td>
                                <td className="px-3 py-2.5 text-gray-700">
                                    <span className="block max-w-44 truncate" title={enrollment.studentEmail || undefined}>
                                        {enrollment.studentEmail || "Not available"}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">{enrollment.semester}</td>
                                <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">{enrollment.year}</td>
                                <td className="whitespace-nowrap px-3 py-2.5">
                                    {enrollment.grade ? (
                                        <span className={`rounded-md border px-2 py-1 font-bold ${gradeColors[enrollment.grade] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                            {enrollment.grade}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 italic">Not graded</span>
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5">
                                    <span className={`rounded-md border px-2 py-1 font-semibold capitalize ${statusColors[enrollment.status]}`}>
                                        {enrollment.status}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                                    {enrollment.enrolledDate
                                        ? new Date(`${enrollment.enrolledDate}T00:00:00`).toLocaleDateString()
                                        : "Not available"}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2.5">
                                    <div className="flex items-center justify-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onView(enrollment)}
                                            className="rounded-md bg-blue-100 px-2 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-200"
                                        >
                                            View
                                        </button>
                                        {onEdit && (!canEdit || canEdit(enrollment)) && (
                                            <button
                                                type="button"
                                                onClick={() => onEdit(enrollment)}
                                                className="rounded-md bg-amber-100 px-2 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {onDelete && (
                                            <button
                                                type="button"
                                                onClick={() => onDelete(enrollment.id)}
                                                className="rounded-md bg-red-100 px-2 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-200"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
