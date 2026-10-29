import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Student } from "@/types/student";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface Props {
    students: Student[];
}

export default function TopStudentsLeaderboard({ students }: Props) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get top 10 students by GPA
    const topStudents = [...students]
        .sort((a, b) => b.gpa - a.gpa)
        .slice(0, 10);

    const chartOptions: ApexCharts.ApexOptions = {
        chart: {
            type: 'bar',
            toolbar: {
                show: false
            },
            animations: {
                enabled: true,
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            }
        },
        plotOptions: {
            bar: {
                horizontal: true,
                borderRadius: 8,
                dataLabels: {
                    position: 'top'
                },
                distributed: true
            }
        },
        colors: [
            '#10B981', // Green for top
            '#3B82F6', // Blue
            '#8B5CF6', // Purple
            '#F59E0B', // Orange
            '#EF4444', // Red
            '#06B6D4', // Cyan
            '#EC4899', // Pink
            '#6366F1', // Indigo
            '#14B8A6', // Teal
            '#F97316'  // Orange-red
        ],
        dataLabels: {
            enabled: true,
            offsetX: -25, // Move text INSIDE the bar end
            style: {
                fontSize: '14px',
                fontWeight: 'bold',
                colors: ['#fff']
            },
            formatter: function (val: any) {
                // Force strict 2 decimal places (e.g. 4.00)
                return Number(val).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
            }
        },
        xaxis: {
            categories: topStudents.map(s => s.name),
            max: 4,
            labels: {
                style: {
                    fontSize: '12px',
                    fontWeight: 600
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    fontSize: '13px',
                    fontWeight: 600
                }
            }
        },
        grid: {
            borderColor: '#e5e7eb',
            strokeDashArray: 4
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: function (val: any) {
                    return "GPA: " + Number(val).toFixed(2);
                }
            },
            style: {
                fontSize: '14px'
            }
        },
        legend: {
            show: false
        }
    };

    const series = [{
        name: 'GPA',
        data: topStudents.map(s => s.gpa)
    }];

    if (!mounted) {
        return (
            <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 h-full">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
                    <div className="space-y-3">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="h-10 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8 relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-green-100 to-blue-100 rounded-full filter blur-3xl opacity-30 -z-10"></div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        Top 10 Students
                    </h2>
                    <p className="text-sm text-gray-600">Ranked by GPA Performance</p>
                </div>
            </div>

            {/* Chart */}
            {topStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                    <div className="p-6 bg-gray-100 rounded-full mb-4">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No student data available</p>
                </div>
            ) : (
                <div className="mt-4">
                    <Chart
                        options={chartOptions}
                        series={series}
                        type="bar"
                        height={400}
                    />
                </div>
            )}

            {/* Footer stats */}
            <div className="mt-6 pt-6 border-t-2 border-gray-200 grid grid-cols-3 gap-4">
                <div className="text-center">
                    <p className="text-sm text-gray-600">Highest GPA</p>
                    <p className="text-2xl font-bold text-green-600">
                        {topStudents.length > 0 ? topStudents[0].gpa.toFixed(2) : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Average (Top 10)</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {topStudents.length > 0
                            ? (topStudents.reduce((sum, s) => sum + s.gpa, 0) / topStudents.length).toFixed(2)
                            : '-'}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-purple-600">{students.length}</p>
                </div>
            </div>
        </div>
    );
}
