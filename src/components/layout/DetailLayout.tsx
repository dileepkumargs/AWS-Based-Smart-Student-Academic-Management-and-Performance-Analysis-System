import Link from "next/link";
import { ReactNode } from "react";
import { ChevronLeft, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DetailLayoutProps {
    title: string;
    subtitle: string;
    badge?: string;
    icon: LucideIcon;
    backHref: string;
    backLabel: string;
    actions?: ReactNode;
    children: ReactNode;
}

export default function DetailLayout({
    title,
    subtitle,
    badge,
    icon: Icon,
    backHref,
    backLabel,
    actions,
    children
}: DetailLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            {/* Hero Section */}
            <div className="bg-slate-900 pt-12 pb-24 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Icon className="w-96 h-96" />
                </div>

                <div className="max-w-[1600px] mx-auto px-8 relative z-10">
                    <Link
                        href={backHref}
                        className="inline-flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 mb-8 font-black uppercase tracking-widest text-[10px]"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {backLabel}
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                        <div className="space-y-4">
                            {badge && (
                                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    {badge}
                                </div>
                            )}
                            <div>
                                <h1 className="text-5xl font-black text-white tracking-tight">{title}</h1>
                                <p className="text-slate-400 font-medium mt-2 text-lg max-w-2xl">{subtitle}</p>
                            </div>
                        </div>

                        {actions && (
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-[1600px] mx-auto px-8 -mt-12 relative z-20">
                {children}
            </div>
        </div>
    );
}
