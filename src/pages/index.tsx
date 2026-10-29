import { useEffect, useState } from "react";
import Link from "next/link";
import { StudentService } from "@/services/student.service";
import { CourseService } from "@/services/course.service";
import { FacultyService } from "@/services/faculty.service";
import { Student } from "@/types/student";
import { Course } from "@/types/course";
import TopStudentsLeaderboard from "@/components/dashboard/TopStudentsLeaderboard";
import CourseEnrollmentChart from "@/components/dashboard/CourseEnrollmentChart";
import { StatCard } from "@/components/ui/StatCard";
import { Users, BookOpen, GraduationCap, BarChart3, Plus, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalFaculty: 0,
    averageGPA: 0,
    loading: true
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const [studentsRes, coursesRes, facultyRes] = await Promise.all([
        StudentService.list({ page: 1, limit: 1000 }),
        CourseService.list({ page: 1, limit: 1000 }),
        FacultyService.list({ page: 1, limit: 1000 })
      ]);

      const studentsData = studentsRes.data;
      const coursesData = coursesRes.data;
      const avgGPA = studentsData.length > 0
        ? studentsData.reduce((sum, s) => sum + s.gpa, 0) / studentsData.length
        : 0;

      setStudents(studentsData);
      setCourses(coursesData);
      setStats({
        totalStudents: studentsRes.meta.total,
        totalCourses: coursesRes.meta.total,
        totalFaculty: facultyRes.meta.total,
        averageGPA: avgGPA,
        loading: false
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 font-medium mt-1">Manage your academic institution with precision</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Students"
          value={stats.loading ? "..." : stats.totalStudents}
          description="Enrolled in active programs"
          icon={Users}
          trend={{ value: 12, isUp: true }}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Active Courses"
          value={stats.loading ? "..." : stats.totalCourses}
          description="Offered this semester"
          icon={BookOpen}
          iconClassName="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Faculty Members"
          value={stats.loading ? "..." : stats.totalFaculty}
          description="Teaching staff"
          icon={GraduationCap}
          iconClassName="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          title="Average GPA"
          value={stats.loading ? "..." : stats.averageGPA.toFixed(2)}
          description="Institutional performance"
          icon={BarChart3}
          trend={{ value: 2.4, isUp: true }}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Analytics */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="overflow-hidden">
            <CardHeader className="bg-slate-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Course Enrollments</CardTitle>
                  <CardDescription>Enrollment trends across departments</CardDescription>
                </div>
                <button className="text-xs font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-700">View Report</button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <CourseEnrollmentChart courses={courses} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "Manage Students", href: "/students", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { name: "Manage Courses", href: "/courses", icon: BookOpen, color: "text-amber-600", bg: "bg-amber-50" },
                  { name: "Manage Faculty", href: "/faculty", icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
                  { name: "Faculty Portal", href: "/faculty/dashboard", icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
                ].map((action) => (
                  <Link
                    key={action.name}
                    href={action.href}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", action.bg)}>
                        <action.icon className={cn("w-5 h-5", action.color)} />
                      </div>
                      <span className="font-bold text-slate-700">{action.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-emerald-900 text-white border-none shadow-xl shadow-emerald-900/20 flex flex-col justify-between">
              <CardContent className="p-8 h-full flex flex-col justify-between">
                <div>
                  <div className="bg-white/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-black leading-tight">Empower Your Faculty Today.</h3>
                  <p className="mt-4 text-emerald-100/70 font-medium">Assign grades, manage courses, and track student progress with our professional portal.</p>
                </div>
                <Link
                  href="/faculty/dashboard"
                  className="mt-8 bg-white text-emerald-900 px-6 py-3 rounded-xl font-bold text-center hover:bg-emerald-50 transition-colors"
                >
                  Enter Faculty Portal
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Leaderboard */}
        <div className="lg:col-span-4">
          <TopStudentsLeaderboard students={students} />
        </div>
      </div>

      {/* System info footer */}
      <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 opacity-60">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Academic Dashboard v2.0.0 &copy; {new Date().getFullYear()}
        </p>
        <div className="flex gap-6 text-xs font-bold text-slate-500 uppercase tracking-widest">
          <button className="hover:text-emerald-600 transition-colors">Documentation</button>
          <button className="hover:text-emerald-600 transition-colors">Support</button>
          <button className="hover:text-emerald-600 transition-colors">Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}
