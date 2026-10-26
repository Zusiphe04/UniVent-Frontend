import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Users,
} from "lucide-react";
import { getEvent } from "../../api/events";
import { bookingExists, createBooking } from "../../api/bookings";

/*
 * FE 31 — Student Event Detail (route: /student/events/:id)
 *
 * Contracts (verified against the issue plan; the UniVent-Backend repo is not
 * available in this workspace, so field/response shapes below are the plan's
 * contract read defensively — confirm with the backend owner):
 *   GET  /api/events/{id}                     -> single event
 *   GET  /api/bookings/exists?eventId={id}    -> whether current student booked
 *   POST /api/bookings  { eventId }           -> create booking (student from JWT)
 *
 * normalizeEvent and parseBookedFlag never assume a single field name and
 * never crash on a missing one. The booking status is only shown as "booked"
 * when the response positively confirms it; ambiguous/error responses leave
 * the status unverified rather than guessing.
 */

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-ZA", {
  hour: "2-digit",
  minute: "2-digit",
});

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeEvent(raw) {
  const venue =
    raw.venueName ??
    (typeof raw.venue === "object"
      ? raw.venue?.venueName ?? raw.venue?.name
      : raw.venue);
  const organizer =
    typeof raw.organizer === "object"
      ? raw.organizer?.name
      : raw.organizer ?? raw.organizerName;
  const capacity =
    raw.capacity ?? raw.maxAttendees ?? raw.maxAttendance ?? raw.maximumAttendance ?? null;
  const spots =
    raw.availableSpots ??
    raw.spotsRemaining ??
    (capacity != null && raw.booked != null ? capacity - raw.booked : null);

  return {
    id: raw.id ?? raw.eventId,
    title: raw.title ?? raw.name ?? "Untitled event",
    category: raw.category ?? "General",
    start:
      toDate(raw.dateTime) ??
      toDate(raw.startsAt) ??
      toDate(raw.startDateTime) ??
      toDate(raw.eventDate) ??
      toDate(raw.date),
    end: toDate(raw.endsAt) ?? toDate(raw.endDateTime) ?? toDate(raw.endTime),
    venue: venue ?? "Venue to be announced",
    organizer: organizer ?? "",
    description: raw.description ?? "",
    image: raw.imageUrl ?? raw.image ?? "",
    status: raw.status ?? "APPROVED",
    capacity: typeof capacity === "number" ? capacity : null,
    spots: typeof spots === "number" ? spots : null,
  };
}

// Returns true/false when the response clearly says so, otherwise null (unknown).
function parseBookedFlag(data) {
  if (typeof data === "boolean") return data;
  if (data && typeof data === "object") {
    for (const key of ["exists", "booked", "hasBooking", "alreadyBooked"]) {
      if (typeof data[key] === "boolean") return data[key];
    }
  }
  return null;
}

const DetailRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3">
    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  </div>
);

export default function EventDetail() {
  const { id } = useParams();
  const hasValidId = Boolean(id && id.trim());

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const [bookedStatus, setBookedStatus] = useState("unknown"); // "unknown" | "booked" | "not-booked"
  const [bookingStatusError, setBookingStatusError] = useState(false);

  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Guards against stale async writes after unmount or route (:id) change.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Each load gets a token; only the latest token may write state. Combined
  // with mountedRef this ignores responses after unmount or an :id change.
  const requestRef = useRef(0);

  const loadEvent = useCallback(async () => {
    const token = ++requestRef.current;
    const isStale = () => requestRef.current !== token || !mountedRef.current;

    setBookingSuccess(false);
    setBookingError("");
    setBookedStatus("unknown");
    setBookingStatusError(false);

    if (!hasValidId) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    setLoading(true);
    setError("");
    setNotFound(false);

    let eventLoaded = false;
    try {
      const data = await getEvent(id);
      if (isStale()) return;
      if (!data) {
        setNotFound(true);
      } else {
        setEvent(normalizeEvent(data));
        eventLoaded = true;
      }
    } catch (requestError) {
      if (isStale()) return;
      if (requestError.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(
          requestError.response?.data?.message ||
            "We could not load this event. Please try again."
        );
      }
    } finally {
      if (!isStale()) setLoading(false);
    }

    // Secondary check: only run if the event loaded. Its failure must not block
    // the page and must never claim the student has/has not booked.
    if (!eventLoaded || isStale()) return;
    try {
      const existsData = await bookingExists(id);
      if (isStale()) return;
      const flag = parseBookedFlag(existsData);
      if (flag === true) setBookedStatus("booked");
      else if (flag === false) setBookedStatus("not-booked");
      else setBookingStatusError(true); // unrecognised shape -> stay unverified
    } catch {
      if (!isStale()) setBookingStatusError(true);
    }
  }, [id, hasValidId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvent();
  }, [loadEvent]);

  const isCancelled = Boolean(event && event.status && event.status !== "APPROVED");
  const isFull = Boolean(event && event.spots != null && event.spots <= 0);
  const alreadyBooked = bookedStatus === "booked";
  const canBook = Boolean(event) && !isCancelled && !isFull && !alreadyBooked;

  const handleBook = async () => {
    if (booking || !canBook) return; // prevent duplicate submissions
    setBooking(true);
    setBookingError("");
    setBookingSuccess(false);
    try {
      await createBooking(id);
      if (!mountedRef.current) return;
      setBookedStatus("booked");
      setBookingSuccess(true);
      setEvent((current) =>
        current && current.spots != null
          ? { ...current, spots: Math.max(0, current.spots - 1) }
          : current
      );
    } catch (requestError) {
      if (!mountedRef.current) return;
      const status = requestError.response?.status;
      if (status === 409) {
        // Already booked (e.g. a race or stale status): reflect the
        // already-booked state and surface the green confirmation instead of a
        // red error. bookingError stays cleared (reset at the start of submit).
        setBookedStatus("booked");
        setBookingError("");
      } else if (status === 400) {
        setBookingError(
          requestError.response?.data?.message ||
            "This event is full, so your booking could not be completed."
        );
      } else {
        setBookingError(
          requestError.response?.data?.message ||
            "Your booking could not be completed. Please try again."
        );
      }
    } finally {
      if (mountedRef.current) setBooking(false);
    }
  };

  const backLink = (
    <Link
      to="/student/events"
      className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to Browse Events
    </Link>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-5 w-40 rounded bg-slate-200" />
          <div className="aspect-[21/9] w-full rounded-2xl bg-slate-200" />
          <div className="h-10 w-2/3 rounded bg-slate-200" />
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="h-64 rounded-2xl bg-slate-200" />
            <div className="h-48 rounded-2xl bg-slate-200" />
          </div>
        </div>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <CalendarDays className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">Event not found</h1>
          <p className="mt-2 text-slate-600">
            This event may have been removed or the link is invalid.
          </p>
          <div className="mt-6">{backLink}</div>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <section className="max-w-lg rounded-2xl border border-red-200 bg-white p-10 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">Event unavailable</h1>
          <p className="mt-2 text-slate-600">{error}</p>
          <button
            type="button"
            onClick={loadEvent}
            className="mt-6 rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white transition hover:bg-sky-800"
          >
            Try again
          </button>
          <div className="mt-4">{backLink}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">{backLink}</div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[21/9] w-full bg-slate-100">
            {event.image ? (
              <img
                src={event.image}
                alt={`${event.title} cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-slate-400">
                <CalendarDays className="h-12 w-12" aria-hidden="true" />
              </div>
            )}
            <span className="absolute left-4 top-4 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white">
              {event.category}
            </span>
          </div>

          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_320px]">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{event.title}</h1>

              {isCancelled && (
                <p
                  role="status"
                  className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
                >
                  This event is {event.status.toLowerCase()} and is not open for booking.
                </p>
              )}

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <DetailRow icon={CalendarDays} label="Date">
                  {event.start ? dateFormatter.format(event.start) : "To be announced"}
                </DetailRow>
                <DetailRow icon={Clock} label="Time">
                  {event.start ? timeFormatter.format(event.start) : "To be announced"}
                  {event.end ? ` – ${timeFormatter.format(event.end)}` : ""}
                </DetailRow>
                <DetailRow icon={MapPin} label="Venue">{event.venue}</DetailRow>
                {event.organizer && (
                  <DetailRow icon={User} label="Organizer">{event.organizer}</DetailRow>
                )}
                {(event.capacity != null || event.spots != null) && (
                  <DetailRow icon={Users} label="Availability">
                    {event.spots != null
                      ? event.spots > 0
                        ? `${event.spots} spots left`
                        : "Fully booked"
                      : "—"}
                    {event.capacity != null ? ` (capacity ${event.capacity})` : ""}
                  </DetailRow>
                )}
              </dl>

              {event.description && (
                <section className="mt-8">
                  <h2 className="text-lg font-bold">About this event</h2>
                  <p className="mt-2 whitespace-pre-line text-slate-700">{event.description}</p>
                </section>
              )}
            </div>

            <aside className="lg:sticky lg:top-6 lg:self-start">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-lg font-bold">Registration</h2>

                {bookingSuccess && (
                  <div
                    role="status"
                    className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Booking confirmed!{" "}
                      <Link to="/student/my-events" className="font-semibold underline">
                        View My Events
                      </Link>
                    </span>
                  </div>
                )}

                {alreadyBooked && !bookingSuccess && (
                  <div
                    role="status"
                    className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      You have already booked this event.{" "}
                      <Link to="/student/my-events" className="font-semibold underline">
                        View My Events
                      </Link>
                    </span>
                  </div>
                )}

                {bookingStatusError && bookedStatus === "unknown" && !bookingSuccess && (
                  <p className="mt-4 text-sm text-slate-500">
                    We could not confirm your current booking status. You can still try to book;
                    we will tell you if you are already registered.
                  </p>
                )}

                {bookingError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {bookingError}
                  </p>
                )}

                {!alreadyBooked && (
                  <button
                    type="button"
                    onClick={handleBook}
                    disabled={!canBook || booking}
                    aria-busy={booking}
                    className="mt-5 w-full rounded-lg bg-sky-700 px-5 py-3 font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {booking
                      ? "Booking…"
                      : isCancelled
                        ? "Event unavailable"
                        : isFull
                          ? "Fully booked"
                          : "Book this event"}
                  </button>
                )}

                {isFull && !alreadyBooked && (
                  <p className="mt-3 text-center text-sm text-slate-500">
                    This event has no spots remaining.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
