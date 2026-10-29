import { useRouter } from "next/router";
import LoginForm from "@/components/auth/LoginForm";
import type { Role } from "@/lib/auth";

const roleByPath: Record<string, Role> = {
    "super-admin": "SUPER_ADMIN",
    faculty: "FACULTY",
    student: "STUDENT"
};

export default function RoleLoginPage() {
    const router = useRouter();
    const roleKey = typeof router.query.role === "string" ? router.query.role : "";
    const role = roleByPath[roleKey];

    if (!router.isReady) return null;
    if (!role) {
        void router.replace("/login");
        return null;
    }
    return <LoginForm role={role} />;
}
