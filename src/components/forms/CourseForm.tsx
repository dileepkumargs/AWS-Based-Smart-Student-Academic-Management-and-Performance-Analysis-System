import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { courseSchema, CourseFormData } from "@/lib/validators";

interface Props {
    onSubmit: (data: CourseFormData) => Promise<void>;
    defaultValues?: Partial<CourseFormData>;
}

export default function CourseForm({ onSubmit, defaultValues }: Props) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<CourseFormData>({
        resolver: zodResolver(courseSchema),
        defaultValues
    });

    const handleFormSubmit = async (data: CourseFormData) => {
        await onSubmit(data);
        if (!defaultValues) {
            reset();
        }
    };

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="border border-gray-200 p-6 rounded-lg mt-6 max-w-2xl bg-white shadow-sm"
        >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
                {defaultValues ? "Edit Course" : "Add New Course"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Course Code */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course Code
                    </label>
                    <input
                        {...register("code")}
                        placeholder="e.g., CS101"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.code && (
                        <p className="text-red-500 text-sm mt-1">{errors.code.message}</p>
                    )}
                </div>

                {/* Course Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Course Name
                    </label>
                    <input
                        {...register("name")}
                        placeholder="e.g., Introduction to Programming"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.name && (
                        <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                </div>

                {/* Credits */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Credits
                    </label>
                    <input
                        type="number"
                        {...register("credits", { valueAsNumber: true })}
                        placeholder="e.g., 3"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.credits && (
                        <p className="text-red-500 text-sm mt-1">{errors.credits.message}</p>
                    )}
                </div>

                {/* Department */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department
                    </label>
                    <input
                        {...register("department")}
                        placeholder="e.g., Computer Science"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.department && (
                        <p className="text-red-500 text-sm mt-1">{errors.department.message}</p>
                    )}
                </div>

                {/* Instructor */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instructor (Optional)
                    </label>
                    <input
                        {...register("instructor")}
                        placeholder="e.g., Dr. Smith"
                        className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.instructor && (
                        <p className="text-red-500 text-sm mt-1">{errors.instructor.message}</p>
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
                    : (defaultValues ? "Save Changes" : "Create Course")}
            </button>
        </form>
    );
}
