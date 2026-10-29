import Link from "next/link";
import { EnrollmentWithDetails } from "@/types/enrollment";

interface Props {
    enrollments: EnrollmentWithDetails[];
    onDelete: (id: number) => void;
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

export default function EnrollmentTable({ enrollments, onDelete }: Props) {
    if (enrollments.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center">
                <div className="flex flex-col items-center">
                    <div className="p-6 bg-purple-100 rounded-full mb-4">
                        <svg className="w-16 h-16 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Enrollments Found</h3>
                    <p className="text-gray-600">Start by creating a new enrollment above</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Student</th>
                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Course</th>
                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Semester</th>
                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Year</th>
                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Grade</th>
                            <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {enrollments.map((enrollment, index) => (
                            <tr
                                key={enrollment.id}
                                className={`hover:bg-purple-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <span className="font-medium text-gray-900">{enrollment.studentName || `Student #${enrollment.studentId}`}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-gray-900">{enrollment.courseCode || `Course #${enrollment.courseId}`}</span>
                                        <span className="text-sm text-gray-600">{enrollment.courseName}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-gray-900 font-medium">{enrollment.semester}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-gray-900 font-medium">{enrollment.year}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {enrollment.grade ? (
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${gradeColors[enrollment.grade] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                                            {enrollment.grade}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 italic">Not graded</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold border-2 capitalize ${statusColors[enrollment.status]}`}>
                                        {enrollment.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => onDelete(enrollment.id)}
                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors duration-200 hover:scale-110 transform"
                                            title="Delete"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
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
