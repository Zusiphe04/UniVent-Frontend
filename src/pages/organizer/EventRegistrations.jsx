import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CircleAlert, Search, Users } from "lucide-react";
import { getEvent } from "../../api/events";
import { getEventRegistrations } from "../../api/organizers";
import StatusBadge from "../../components/shared/StatusBadge";
import { formatDate } from "../../lib/format";

const asList = (data) => Array.isArray(data) ? data : data?.content ?? data?.bookings ?? data?.registrations ?? [];
const registeredUser = (row) => row.student ?? row.user ?? row.attendee ?? {
  name: row.attendeeName,
  email: row.email,
  studentNumber: row.studentNumber,
};

export default function EventRegistrations() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [eventResult, registrationsResult] = await Promise.allSettled([getEvent(id), getEventRegistrations(id)]);
    if (eventResult.status === "fulfilled") setEvent(eventResult.value);
    if (registrationsResult.status === "fulfilled") setRegistrations(asList(registrationsResult.value));
    const failed = [eventResult, registrationsResult].find((result) => result.status === "rejected");
    if (failed) setError(failed.reason?.response?.data?.message || "Attendee information could not be loaded.");
    setLoading(false);
  }, [id]);
  useEffect(() => {
    // Fetching registrations synchronizes this page with the event API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return registrations.filter((row) => { const user = registeredUser(row); return !term || [user.name, user.email, user.studentNumber, row.status].some((value) => String(value ?? "").toLowerCase().includes(term)); });
  }, [registrations, query]);

  return (
    <main className="min-h-[calc(100vh-140px)] bg-[#f7f7f8] px-5 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <Link to="/organizer" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline"><ArrowLeft size={16} />Back to my events</Link>
        <header className="mb-7"><p className="text-sm text-slate-500">Organizer workspace · Attendees</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{event?.title ?? "Event attendees"}</h1><p className="mt-2 text-slate-600">Review student registrations for this event.</p></header>
        {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><CircleAlert size={18} />{error}<button onClick={load} className="ml-auto font-semibold underline">Retry</button></div>}
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-4"><label className="relative block w-full max-w-sm"><span className="sr-only">Search attendees</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or student number…" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" /></label><div className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600"><Users size={17} /><span className="font-semibold text-slate-950">{loading ? "…" : visible.length}</span> attendee{visible.length === 1 ? "" : "s"}</div></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-y border-slate-100 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-3 font-semibold">Student</th><th className="px-3 py-3 font-semibold">Student number</th><th className="px-3 py-3 font-semibold">Registered</th><th className="px-3 py-3 font-semibold">Status</th></tr></thead><tbody className="divide-y divide-slate-100">
            {!loading && visible.map((row) => { const user = registeredUser(row); return <tr key={row.id ?? user.id ?? user.email} className="hover:bg-slate-50"><td className="px-3 py-4"><div className="font-semibold">{user.name ?? ([user.firstName, user.surname].filter(Boolean).join(" ") || "—")}</div><div className="mt-1 text-xs text-slate-500">{user.email ?? "—"}</div></td><td className="px-3 py-4">{user.studentNumber ?? "—"}</td><td className="px-3 py-4">{formatDate(row.bookingTime ?? row.createdAt ?? row.registeredAt ?? row.bookingDate) || "—"}</td><td className="px-3 py-4"><StatusBadge status={row.status ?? "REGISTERED"} className="text-xs" /></td></tr>; })}
            {loading && <tr><td colSpan="4" className="px-3 py-16 text-center text-slate-500">Loading registrations…</td></tr>}
            {!loading && visible.length === 0 && <tr><td colSpan="4" className="px-3 py-16 text-center"><Users className="mx-auto mb-3 text-slate-400" /><p className="font-semibold">No registrations to show</p><p className="mt-1 text-sm text-slate-500">Student registrations will appear here.</p></td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </main>
  );
}
