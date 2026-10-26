import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, RefreshCw, Ticket, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { cancelBooking, getMyBookings } from "@/api/bookings";
import StatusBadge from "@/components/shared/StatusBadge";
import { formatDate, formatTimeRange } from "@/lib/format";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

function groupFor(booking) {
  if (booking.status === "CANCELLED") return "cancelled";
  const eventDate = new Date(booking.eventDateTime);
  return !Number.isNaN(eventDate.getTime()) && eventDate < new Date() ? "past" : "upcoming";
}

function BookingSkeleton() {
  return (
    <div aria-hidden="true" className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
      <div className="h-6 w-2/3 rounded bg-slate-200" />
      <div className="mt-4 h-4 w-1/2 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
      <div className="mt-6 h-10 w-56 rounded bg-slate-200" />
    </div>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getMyBookings();
      setBookings(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We could not load your bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Loading remote bookings is the synchronization performed by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBookings();
  }, [loadBookings]);

  const visibleBookings = useMemo(
    () => bookings.filter((booking) => groupFor(booking) === activeTab),
    [bookings, activeTab]
  );

  async function handleCancel(booking) {
    if (!window.confirm("Cancel your registration for " + booking.eventTitle + "?")) return;
    setCancelling(booking.bookingReference);
    setError("");
    try {
      const updated = await cancelBooking(booking.bookingReference);
      setBookings((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
      setActiveTab("cancelled");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The booking could not be cancelled.");
    } finally {
      setCancelling("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">My events</h1>
          <p className="mt-2 text-slate-600">Registrations, tickets and attendance history</p>
        </header>

        <div className="mt-8 flex gap-2 border-b border-slate-200" role="tablist" aria-label="Booking status">
          {TABS.map((tab) => {
            const count = bookings.filter((booking) => groupFor(booking) === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={
                  "border-b-2 px-5 py-3 font-semibold transition " +
                  (activeTab === tab.id
                    ? "border-[#0072bc] text-[#0072bc]"
                    : "border-transparent text-slate-500 hover:text-slate-900")
                }
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {error && (
          <div role="alert" className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
            <span>{error}</span>
            <button type="button" onClick={loadBookings} className="inline-flex items-center gap-2 font-semibold">
              <RefreshCw size={16} aria-hidden="true" /> Retry
            </button>
          </div>
        )}

        <section className="mt-6 space-y-5" aria-live="polite">
          {loading && [1, 2, 3].map((item) => <BookingSkeleton key={item} />)}

          {!loading && visibleBookings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <Ticket className="mx-auto text-slate-400" size={42} aria-hidden="true" />
              <h2 className="mt-4 text-xl font-bold">No {activeTab} events</h2>
              <p className="mt-2 text-slate-600">
                {activeTab === "upcoming"
                  ? "Browse events and register to see them here."
                  : "You do not have any " + activeTab + " registrations."}
              </p>
              {activeTab === "upcoming" && (
                <Link to="/student/events" className="mt-6 inline-flex rounded-lg bg-[#0072bc] px-5 py-3 font-semibold text-white hover:bg-[#005f9e]">
                  Browse events
                </Link>
              )}
            </div>
          )}

          {!loading && visibleBookings.map((booking) => {
            const cancelled = booking.status === "CANCELLED";
            return (
              <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-5 sm:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{booking.eventTitle}</h2>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays size={18} aria-hidden="true" />
                        {formatDate(booking.eventDateTime) || "Date to be confirmed"}
                        {booking.eventDateTime ? " · " + formatTimeRange(booking.eventDateTime) : ""}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <MapPin size={18} aria-hidden="true" />
                        {booking.venueName || "Venue to be confirmed"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Booking reference: <span className="font-mono text-slate-700">{booking.bookingReference}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3 sm:self-end">
                    <Link
                      to={"/student/tickets/" + booking.id}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <Ticket size={17} aria-hidden="true" /> View ticket
                    </Link>
                    {!cancelled && groupFor(booking) === "upcoming" && (
                      <button
                        type="button"
                        onClick={() => handleCancel(booking)}
                        disabled={cancelling === booking.bookingReference}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <XCircle size={17} aria-hidden="true" />
                        {cancelling === booking.bookingReference ? "Cancelling…" : "Cancel registration"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}