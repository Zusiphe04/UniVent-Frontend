import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CalendarDays,
  Clock,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import { getEvents } from "../../api/events";

/*
 * FE 30 — Browse Events (route: /student/events)
 *
 * Fetches the approved event collection through the agreed BE 04 contract:
 *   GET /api/events?search=&category=&from=&to=&status=APPROVED&page=&size=
 *
 * The exact EventSummaryResponse field names are not finalised by BE 04 yet,
 * so `normalizeEvent` reads the fields named in the issue plan defensively and
 * never crashes on a missing one. Confirm the final shape with the backend
 * owner before relying on it in production.
 *
 * Card markup is kept local to this page on purpose: the shared EventCard
 * (FE 51, owned by Sesethu) is not yet available on this branch. Once it is
 * merged, swap <EventCardItem /> for the shared component.
 */

const CATEGORIES = ["All", "Workshop", "Career", "Competition", "Sports", "Academic"];
const PAGE_SIZE = 9;

const dateFormatter = new Intl.DateTimeFormat("en-ZA", {
  weekday: "short",
  day: "numeric",
  month: "short",
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
  const start =
    toDate(raw.dateTime) ??
    toDate(raw.startsAt) ??
    toDate(raw.startDateTime) ??
    toDate(raw.eventDate) ??
    toDate(raw.date);
  const spots =
    raw.availableSpots ??
    raw.spotsRemaining ??
    (raw.capacity != null && raw.booked != null
      ? raw.capacity - raw.booked
      : null);

  return {
    id: raw.id ?? raw.eventId,
    title: raw.title ?? raw.name ?? "Untitled event",
    category: raw.category ?? "General",
    start,
    venue: venue ?? "Venue to be announced",
    organizer: organizer ?? "",
    description: raw.description ?? "",
    image: raw.imageUrl ?? raw.image ?? "",
    status: raw.status ?? "APPROVED",
    spots: typeof spots === "number" ? spots : null,
  };
}

// Spring may return a plain array or a Page<> wrapper; support both.
function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function EventCardItem({ event }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {event.image ? (
          <img
            src={event.image}
            alt={`${event.title} cover`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-slate-400">
            <CalendarDays className="h-10 w-10" aria-hidden="true" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-slate-950/85 px-3 py-1 text-xs font-semibold text-white">
          {event.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-slate-900">{event.title}</h3>

        <dl className="mt-3 space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
            <dt className="sr-only">Date</dt>
            <dd>{event.start ? dateFormatter.format(event.start) : "Date to be announced"}</dd>
          </div>
          {event.start && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
              <dt className="sr-only">Time</dt>
              <dd>{timeFormatter.format(event.start)}</dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
            <dt className="sr-only">Venue</dt>
            <dd>{event.venue}</dd>
          </div>
          {event.spots != null && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
              <dt className="sr-only">Spots remaining</dt>
              <dd>{event.spots > 0 ? `${event.spots} spots left` : "Fully booked"}</dd>
            </div>
          )}
        </dl>

        {event.description && (
          <p className="mt-3 line-clamp-2 text-sm text-slate-600">{event.description}</p>
        )}

        <Link
          to={`/student/events/${event.id}`}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

function EventCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="aspect-video w-full bg-slate-200" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-3/4 rounded bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-200" />
        <div className="h-4 w-2/3 rounded bg-slate-200" />
        <div className="h-9 w-full rounded bg-slate-200" />
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100";

export default function StudentEventFeed() {
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 300);
  const requestId = useRef(0);

  const loadEvents = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      // Send the agreed contract params to the backend. Client-side filtering
      // below keeps the UX consistent even if the backend ignores a param.
      const data = await getEvents({
        search: debouncedSearch,
        category: category === "All" ? "" : category,
        from,
        to,
        status: "APPROVED",
        page: 0,
        size: 100,
      });
      if (currentRequest === requestId.current) {
        setRawEvents(extractList(data).map(normalizeEvent));
      }
    } catch (requestError) {
      if (currentRequest === requestId.current) {
        setError(
          requestError.response?.data?.message ||
            "We could not load events right now. Please try again."
        );
        setRawEvents([]);
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [debouncedSearch, category, from, to]);

  useEffect(() => {
    // Refetch whenever the agreed query parameters change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadEvents();
  }, [loadEvents]);

  // Approved events make up the Browse grid; fully-booked ones still appear,
  // labelled "Fully booked".
  const approvedEvents = useMemo(
    () => rawEvents.filter((event) => event.status === "APPROVED"),
    [rawEvents]
  );

  // "Open for registration" excludes events that are known to be full. When
  // availability is unknown (spots === null, e.g. backend omits the field) the
  // event is still counted so we never under-report.
  const openForRegistrationCount = useMemo(
    () =>
      approvedEvents.filter((event) => event.spots == null || event.spots > 0)
        .length,
    [approvedEvents]
  );

  const filteredEvents = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    // Parse both bounds in local time so the range comparison is
    // timezone-consistent (previously `from` parsed as UTC midnight while
    // `to` parsed as local, which could drop/keep an event near midnight).
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDateValue = to ? new Date(`${to}T23:59:59`) : null;

    return approvedEvents.filter((event) => {
      if (category !== "All" && event.category?.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (term) {
        const haystack = `${event.title} ${event.venue} ${event.organizer}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (fromDate && (!event.start || event.start < fromDate)) return false;
      if (toDateValue && (!event.start || event.start > toDateValue)) return false;
      return true;
    });
  }, [approvedEvents, debouncedSearch, category, from, to]);

  // Pagination is currently client-side over the events fetched above.
  // LIMITATION: BE 04 (GET /api/events) is not implemented yet, so the agreed
  // page/size query params cannot drive real server-side paging. We request a
  // single large page (size 100) and paginate the result in the browser. Once
  // BE 04 lands, move paging server-side and drive `page`/`size` from this
  // control — otherwise only the first 100 approved events are reachable.
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedEvents = useMemo(
    () => filteredEvents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredEvents, safePage]
  );

  useEffect(() => {
    // Reset to the first page whenever the filtered result set changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch, category, from, to]);

  const hasActiveFilters =
    search !== "" || category !== "All" || from !== "" || to !== "";

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setFrom("");
    setTo("");
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Browse Events</h1>
          <p className="mt-2 text-slate-600" role="status" aria-live="polite">
            {loading
              ? "Loading events…"
              : `${openForRegistrationCount} ${
                  openForRegistrationCount === 1 ? "event" : "events"
                } open for registration`}
          </p>
        </header>

        <section
          aria-label="Event filters"
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <label className="block text-sm font-semibold text-slate-800">
              Search
              <div className="relative mt-2">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by event, venue or organizer"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              Category
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={`${inputClass} mt-2`}
              >
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              Date from
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
                className={`${inputClass} mt-2`}
              />
            </label>

            <label className="block text-sm font-semibold text-slate-800">
              Date to
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
                className={`${inputClass} mt-2`}
              />
            </label>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Showing {filteredEvents.length} of {approvedEvents.length} events
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Reset filters
              </button>
            </div>
          )}
        </section>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <EventCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <section className="grid place-items-center rounded-2xl border border-red-200 bg-white p-12 text-center shadow-sm">
            <AlertCircle className="h-10 w-10 text-red-500" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold">Events unavailable</h2>
            <p className="mt-2 max-w-md text-slate-600">{error}</p>
            <button
              type="button"
              onClick={loadEvents}
              className="mt-6 rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white transition hover:bg-sky-800"
            >
              Try again
            </button>
          </section>
        ) : filteredEvents.length === 0 ? (
          <section className="grid place-items-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <CalendarDays className="h-10 w-10 text-slate-400" aria-hidden="true" />
            <h2 className="mt-4 text-xl font-bold">No events found</h2>
            <p className="mt-2 max-w-md text-slate-600">
              {hasActiveFilters
                ? "No events match your filters yet. Try adjusting or resetting them."
                : "There are no events open for registration right now. Please check back soon."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 rounded-lg border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Reset filters
              </button>
            )}
          </section>
        ) : (
          <>
            <ul className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {pagedEvents.map((event) => (
                <li key={event.id}>
                  <EventCardItem event={event} />
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <nav
                aria-label="Events pagination"
                className="mt-10 flex items-center justify-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage === 1}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600" aria-current="page">
                  Page {safePage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage === totalPages}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
