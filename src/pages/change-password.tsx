import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";

export default function ChangePasswordPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmation, setConfirmation] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        if (newPassword !== confirmation) {
            setError("New passwords do not match.");
            return;
        }
        setSaving(true);
        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const result = await response.json().catch(() => ({})) as { message?: string };
            if (!response.ok) {
                setError(result.message || "Unable to update your password.");
                return;
            }
            const destination = user?.role === "SUPER_ADMIN"
                ? "/super-admin/dashboard"
                : user?.role === "FACULTY"
                    ? "/faculty/dashboard"
                    : user?.role === "STUDENT"
                        ? "/student/dashboard"
                        : "/login";
            await router.replace(destination);
        } catch {
            setError("Unable to update your password. Please try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-12">
            <section className="mx-auto max-w-lg rounded-3xl bg-white p-8 shadow-xl">
                <h1 className="text-3xl font-black text-slate-900">Update your password</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">Choose a unique password with at least 12 characters. Your other sessions will be signed out.</p>
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <label className="block text-sm font-bold text-slate-700">
                        Current password
                        <input required autoComplete="current-password" type="password" maxLength={256} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
                    </label>
                    <label className="block text-sm font-bold text-slate-700">
                        New password
                        <input required minLength={12} autoComplete="new-password" type="password" maxLength={256} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
                    </label>
                    <label className="block text-sm font-bold text-slate-700">
                        Confirm new password
                        <input required minLength={12} autoComplete="new-password" type="password" maxLength={256} value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />
                    </label>
                    {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                    <button disabled={saving} className="w-full rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
                        {saving ? "Saving..." : "Change password"}
                    </button>
                </form>
            </section>
        </main>
    );
}
