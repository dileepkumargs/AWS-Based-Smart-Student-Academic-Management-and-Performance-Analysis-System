import { useEffect, useState } from "react";

interface AuditEvent {
    id: string;
    actorUserId: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    details: Record<string, unknown>;
    createdAt: string;
}

export default function AuditLogsPage() {
    const [events, setEvents] = useState<AuditEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetch("/api/audit-logs?page=1&limit=100", { cache: "no-store" })
            .then(async response => {
                if (!response.ok) throw new Error("Unable to load audit history.");
                const result = await response.json() as { data: AuditEvent[] };
                setEvents(result.data);
            })
            .catch(loadError => {
                console.error("Failed to load audit logs:", loadError);
                setError("Audit history could not be loaded.");
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="mx-auto max-w-7xl space-y-6 p-6 sm:p-8">
            <header>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Super Admin</p>
                <h1 className="mt-2 text-4xl font-black text-slate-900">Audit history</h1>
                <p className="mt-2 text-slate-600">Recent account and academic record changes.</p>
            </header>
            {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
                {loading ? <p className="p-8" role="status">Loading audit history...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr><th className="px-6 py-4">When</th><th className="px-6 py-4">Actor</th><th className="px-6 py-4">Action</th><th className="px-6 py-4">Record</th><th className="px-6 py-4">Details</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {events.map(event => (
                                    <tr key={event.id}>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-600">{new Date(event.createdAt).toLocaleString()}</td>
                                        <td className="px-6 py-4">{event.actorUserId ?? "System"}</td>
                                        <td className="px-6 py-4 font-semibold text-slate-900">{event.action}</td>
                                        <td className="px-6 py-4">{event.resourceType} {event.resourceId ?? ""}</td>
                                        <td className="max-w-sm truncate px-6 py-4 text-slate-500">{JSON.stringify(event.details)}</td>
                                    </tr>
                                ))}
                                {!events.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">No audit entries yet.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </main>
    );
}
