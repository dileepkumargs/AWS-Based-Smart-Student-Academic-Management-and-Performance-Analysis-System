import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
    icon: LucideIcon;
    trend?: {
        value: number;
        isUp: boolean;
    };
    className?: string;
    iconClassName?: string;
}

export function StatCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    className,
    iconClassName,
}: StatCardProps) {
    return (
        <Card className={cn("group", className)}>
            <CardContent className="flex items-center justify-between p-6">
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
                        {trend && (
                            <span className={cn(
                                "text-xs font-bold px-1.5 py-0.5 rounded-md",
                                trend.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                                {trend.isUp ? '↑' : '↓'} {trend.value}%
                            </span>
                        )}
                    </div>
                    {description && (
                        <p className="text-xs font-medium text-slate-500">{description}</p>
                    )}
                </div>
                <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 shadow-sm",
                    iconClassName || "bg-emerald-50 text-emerald-600",
                )}>
                    <Icon className="h-7 w-7" />
                </div>
            </CardContent>
        </Card>
    );
}
