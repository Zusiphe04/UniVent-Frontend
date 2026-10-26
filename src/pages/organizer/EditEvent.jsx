import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CircleAlert } from "lucide-react";
import { getEvent, updateEvent } from "../../api/events";
import { getVenues } from "../../api/venues";

const inputClass = "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100";
const categories = ["Workshop", "Career", "Sports", "Cultural", "Academic", "Social", "Other"];
const localInputDateTime = (value) => { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

export default function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [eventResult, venuesResult] = await Promise.allSettled([getEvent(id), getVenues()]);
    if (eventResult.status === "fulfilled") { const event = eventResult.value; setForm({ title: event.title ?? "", category: event.category ?? "Workshop", organizingDepartment: event.organizingDepartment ?? "", description: event.description ?? "", dateTime: localInputDateTime(event.dateTime), endDateTime: localInputDateTime(event.endDateTime), venueId: event.venueId ?? event.venue?.id ?? "", capacity: event.capacity ?? event.maxAttendees ?? "", imageUrl: event.imageUrl ?? null }); }
    if (venuesResult.status === "fulfilled") { const list = Array.isArray(venuesResult.value) ? venuesResult.value : venuesResult.value?.content ?? venuesResult.value?.venues ?? []; setVenues(list.map((venue) => ({ ...venue, id: venue.id ?? venue.venueId, name: venue.name ?? venue.venueName }))); }
    const failed = [eventResult, venuesResult].find((result) => result.status === "rejected");
    if (failed) setError(failed.reason?.response?.data?.message || "Event information could not be loaded.");
    setLoading(false);
  }, [id]);
  useEffect(() => {
    // Loading the event and venue options synchronizes this form with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      await updateEvent(id, { title: form.title.trim(), category: form.category, description: form.description.trim(), dateTime: new Date(form.dateTime).toISOString(), endDateTime: form.endDateTime ? new Date(form.endDateTime).toISOString() : null, venueId: form.venueId, imageUrl: form.imageUrl, maxAttendees: Number(form.capacity) });
      navigate("/organizer", { replace: true });
    } catch (requestError) { setError(requestError.response?.data?.message || "The event could not be updated."); }
    finally { setSaving(false); }
  };

  if (loading) return <main className="min-h-screen bg-[#f7f7f8] px-5 py-12"><div className="mx-auto max-w-4xl animate-pulse rounded-xl bg-white p-8 text-slate-500">Loading event…</div></main>;
  if (!form) return <main className="min-h-screen bg-[#f7f7f8] px-5 py-12"><div role="alert" className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-6 text-red-800">{error || "Event could not be found."}<button onClick={load} className="ml-3 font-semibold underline">Retry</button></div></main>;

  return <main className="min-h-[calc(100vh-140px)] bg-[#f7f7f8] px-5 py-8 text-slate-950 sm:px-8"><form onSubmit={submit} className="mx-auto max-w-4xl"><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-slate-500">Organizer workspace</p><h1 className="mt-1 text-3xl font-bold">Edit event</h1><p className="mt-2 text-slate-600">Update the event details and save your changes.</p></div><div className="flex gap-3"><Link to="/organizer" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">Cancel</Link><button disabled={saving} className="rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div></header>{error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><CircleAlert size={18} />{error}</div>}<section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Event name<input required className={inputClass} value={form.title} onChange={(e) => setValue("title", e.target.value)} /></label><label className="text-sm font-medium">Category<select className={inputClass} value={form.category} onChange={(e) => setValue("category", e.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-sm font-medium">Organizing department / society<input className={inputClass} value={form.organizingDepartment} onChange={(e) => setValue("organizingDepartment", e.target.value)} /></label><label className="text-sm font-medium sm:col-span-2">Description<textarea required rows={4} className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-sky-600 focus:ring-4 focus:ring-sky-100" value={form.description} onChange={(e) => setValue("description", e.target.value)} /></label><label className="text-sm font-medium">Start date and time<input required type="datetime-local" className={inputClass} value={form.dateTime} onChange={(e) => setValue("dateTime", e.target.value)} /></label><label className="text-sm font-medium">End date and time<input required type="datetime-local" className={inputClass} value={form.endDateTime} onChange={(e) => setValue("endDateTime", e.target.value)} /></label><label className="text-sm font-medium">Venue<select required className={inputClass} value={form.venueId} onChange={(e) => setValue("venueId", e.target.value)}><option value="">Select venue</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name ?? venue.venueName}</option>)}</select></label><label className="text-sm font-medium">Registration capacity<input required min="1" type="number" className={inputClass} value={form.capacity} onChange={(e) => setValue("capacity", e.target.value)} /></label></div></section></form></main>;
}
