import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { facultySchema, FacultyFormData } from "@/lib/validators";

interface Props {
    onSubmit: (data: FacultyFormData) => Promise<void>;
    defaultValues?: Partial<FacultyFormData>;
}

export default function FacultyForm({ onSubmit, defaultValues }: Props) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<FacultyFormData>({
        resolver: zodResolver(facultySchema),
        defaultValues
    });

    const handleFormSubmit = async (data: FacultyFormData) => {
        await onSubmit(data);
        if (!defaultValues) {
            reset();
        }
    };

    return (
        <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className="relative overflow-hidden border-2 border-gray-200 p-8 rounded-2xl mt-6 max-w-4xl bg-gradient-to-br from-white to-gray-50 shadow-xl hover:shadow-2xl transition-all duration-300"
        >
            {/* Decorative gradient background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full filter blur-3xl opacity-30 -z-10"></div>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {defaultValues ? "Edit Faculty Member" : "Add New Faculty Member"}
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Full Name
                        </span>
                    </label>
                    <input
                        {...register("name")}
                        placeholder="e.g., Dr. Jane Smith"
                        className="border-2 border-gray-300 rounded-xl p-3 w-full focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 hover:border-indigo-300"
                    />
                    {errors.name && (
                        <p className="text-red-500 text-sm mt-2 flex items-center gap-1 animate-shake">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.name.message}
                        </p>
                    )}
                </div>

                {/* Email */}
                <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email Address
                        </span>
                    </label>
                    <input
                        type="email"
                        {...register("email")}
                        placeholder="e.g., jane.smith@university.edu"
                        className="border-2 border-gray-300 rounded-xl p-3 w-full focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 hover:border-indigo-300"
                    />
                    {errors.email && (
                        <p className="text-red-500 text-sm mt-2 flex items-center gap-1 animate-shake">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.email.message}
                        </p>
                    )}
                </div>

                {/* Department */}
                <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Department
                        </span>
                    </label>
                    <input
                        {...register("department")}
                        placeholder="e.g., Computer Science"
                        className="border-2 border-gray-300 rounded-xl p-3 w-full focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 hover:border-indigo-300"
                    />
                    {errors.department && (
                        <p className="text-red-500 text-sm mt-2 flex items-center gap-1 animate-shake">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.department.message}
                        </p>
                    )}
                </div>

                {/* Specialization */}
                <div className="group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            Specialization
                        </span>
                    </label>
                    <input
                        {...register("specialization")}
                        placeholder="e.g., Machine Learning"
                        className="border-2 border-gray-300 rounded-xl p-3 w-full focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 hover:border-indigo-300"
                    />
                    {errors.specialization && (
                        <p className="text-red-500 text-sm mt-2 flex items-center gap-1 animate-shake">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.specialization.message}
                        </p>
                    )}
                </div>

                {/* Phone (Optional) */}
                <div className="md:col-span-2 group">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 group-hover:text-indigo-600 transition-colors">
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
                        </span>
                    </label>
                    <input
                        type="tel"
                        {...register("phone")}
                        placeholder="e.g., +1-555-0123"
                        className="border-2 border-gray-300 rounded-xl p-3 w-full focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-200 hover:border-indigo-300"
                    />
                    {errors.phone && (
                        <p className="text-red-500 text-sm mt-2 flex items-center gap-1 animate-shake">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {errors.phone.message}
                        </p>
                    )}
                </div>
            </div>

            <button
                type="submit"
                disabled={isSubmitting}
                className="mt-8 relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transform flex items-center gap-3 group"
            >
                <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isSubmitting
                    ? (defaultValues ? "Saving..." : "Creating...")
                    : (defaultValues ? "Save Changes" : "Create Faculty Member")}
            </button>
        </form>
    );
}
