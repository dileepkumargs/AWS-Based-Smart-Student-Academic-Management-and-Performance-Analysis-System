import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { studentSchema, StudentFormData } from "@/lib/validators";

interface Props {
    onSubmit: (data: StudentFormData) => Promise<void>;
    defaultValues?: Partial<StudentFormData>;
}

export default function StudentForm({ onSubmit, defaultValues }: Props) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<StudentFormData>({
        resolver: zodResolver(studentSchema),
        defaultValues
    });

    const handleFormSubmit = async (data: StudentFormData) => {
        await onSubmit(data);
        if (!defaultValues) {
            reset(); // Only clear form after create, not edit
        }
    };

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="border border-gray-200 p-6 rounded-lg mt-6 max-w-2xl bg-white shadow-sm"
        >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Student</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                    </label>
                    <input
                        {...register("name")}
                        placeholder="Enter student name"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                </div>

                {/* Year Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                    </label>
                    <input
                        type="number"
                        {...register("year", { valueAsNumber: true })}
                        placeholder="e.g., 2024"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.year && (
                        <p className="text-red-500 text-sm mt-1">{errors.year.message}</p>
                    )}
                </div>

                {/* Course Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course
                    </label>
                    <input
                        {...register("course")}
                        placeholder="e.g., Computer Science"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.course && (
                        <p className="text-red-500 text-sm mt-1">{errors.course.message}</p>
                    )}
                </div>

                {/* GPA Field */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        GPA
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        {...register("gpa", { valueAsNumber: true })}
                        placeholder="0.0 - 4.0"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.gpa && (
                        <p className="text-red-500 text-sm mt-1">{errors.gpa.message}</p>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isSubmitting
                    ? (defaultValues ? "Saving..." : "Creating...")
                    : (defaultValues ? "Save Changes" : "Create Student")}
            </button>
        </form>
    );
}
