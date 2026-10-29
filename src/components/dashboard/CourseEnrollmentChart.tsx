import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Course } from "@/types/course";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props {
    courses: Course[];
}

export default function CourseEnrollmentChart({ courses }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const [enrollmentData, setEnrollmentData] = useState<{ name: string; fullName: string; enrollments: number }[]>([]);

    useEffect(() => {
        if (courses.length > 0) {
            fetchEnrollmentCounts();
        }
    }, [courses]);

    async function fetchEnrollmentCounts() {
        const _import_EnrollmentService = (await import("@/services/enrollment.service")).EnrollmentService;

        try {
            const promises = courses.map(async (course) => {
                // Get real enrollments for this course
                const enrollments = await _import_EnrollmentService.getByCourse(course.id);
                // Filter only 'enrolled' or 'completed' status to count as active students
                const activeCount = enrollments.filter(e => e.status === 'enrolled' || e.status === 'completed').length;

                return {
                    name: course.code,
                    fullName: course.name,
                    enrollments: activeCount
                };
            });

            const results = await Promise.all(promises);
            setEnrollmentData(results);
        } catch (error) {
            console.error("Failed to fetch real enrollment counts:", error);
        }
    }

    const chartOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'bar',
            toolbar: {
                show: false
            },
            animations: {
                enabled: true,
                speed: 800
            }
        },
        plotOptions: {
            bar: {
                borderRadius: 10,
                columnWidth: '70%',
                dataLabels: {
                    position: 'top'
                }
            }
        },
        colors: ['#3B82F6'],
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'light',
                type: 'vertical',
                shadeIntensity: 0.5,
                gradientToColors: ['#8B5CF6'],
                inverseColors: false,
                opacityFrom: 1,
                opacityTo: 0.9,
                stops: [0, 100]
            }
        },
        dataLabels: {
            enabled: true,
            offsetY: -25,
            style: {
                fontSize: '14px',
                fontWeight: 'bold',
                colors: ['#4B5563']
            }
        },
        xaxis: {
            categories: enrollmentData.map(e => e.name),
            labels: {
                style: {
                    fontSize: '13px',
                    fontWeight: 600
                }
            }
        },
        yaxis: {
            title: {
                text: 'Number of Students',
                style: {
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#4B5563'
                }
            },
            labels: {
                style: {
                    fontSize: '13px',
                    fontWeight: 600
                }
            }
        },
        grid: {
            borderColor: '#e5e7eb',
            strokeDashArray: 4,
            yaxis: {
                lines: {
                    show: true
                }
            }
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function (val: any) {
                    return val + " students";
                }
            },
            x: {
                formatter: function (val: any, opts: any) {
                    const course = enrollmentData[opts.dataPointIndex];
                    return course ? course.fullName : val;
                }
            },
            style: {
                fontSize: '14px'
            }
        }
    };

    const series = [{
        name: 'Enrollments',
        data: enrollmentData.map(e => e.enrollments)
    }];

    if (!mounted) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 h-full">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full filter blur-3xl opacity-30 -z-10"></div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Course Enrollments
                    </h2>
                    <p className="text-sm text-gray-600">Current semester enrollment statistics</p>
                </div>
            </div>

            {/* Chart */}
            {courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="p-6 bg-gray-100 rounded-full mb-4">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No course data available</p>
                </div>
            ) : (
                <div className="mt-4">
                    <Chart
                        options={chartOptions}
                        series={series}
                        type="bar"
                        height={350}
                    />
                </div>
            )}

            {/* Footer stats */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200 grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="text-sm text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-blue-600">{courses.length}</p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Avg. Enrollment</p>
                    <p className="text-2xl font-bold text-purple-600">
                        {enrollmentData.length > 0
                            ? Math.round(enrollmentData.reduce((sum, e) => sum + e.enrollments, 0) / enrollmentData.length)
                            : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-indigo-600">
                        {enrollmentData.reduce((sum, e) => sum + e.enrollments, 0)}
                    </p>
                </div>
            </div>
        </div>
    );
}
