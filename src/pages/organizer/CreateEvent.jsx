import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CalendarPlus, CheckCircle2, LoaderCircle } from "lucide-react";
import { createEvent } from "../../api/events";
import { getVenues } from "../../api/venues";
import {
  EMPTY_CREATE_EVENT_FORM,
  EVENT_CATEGORIES,
  buildEventCreateRequest,
  createSubmitLock,
  extractVenueList,
  normalizeVenue,
  validateCreateEventForm,
} from "./createEventForm";

/*
 * FE 32 — Organizer Create Event (route: /organizer/events/create)
 *
 * Contracts from the issue plan (BE 04 / BE 08 were not verified against a
 * live backend in this workspace):
 *   GET  /api/venues
 *   POST /api/events  EventCreateRequest including venueId
 *
 * Organizer identity and the initial workflow status are not posted; the
 * backend derives them from the JWT. Nested venue / organizer entities are
 * not sent. Field-name uncertainty is documented in createEventForm.js.
 *
 * Duplicate clicks are blocked by a synchronous submit lock plus a disabled
 * submit button so only one POST leaves the page. Failed submits keep the
 * form values.
 */

const inputClass =
  "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const textareaClass =
  "min-h-32 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100";

function Field({ id, label, error, hint, children }) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, !error && hint ? hintId : null]
    .filter(Boolean)
    .join(" ") || undefined;
  return (
    <div className="block">
      <label htmlFor={id} className="text-sm font-semibold text-slate-800">
        {label}
      </label>
      <div className="mt-2">
        {typeof children === "function" ? children(describedBy) : children}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CreateEvent() {
  const navigate = useNavigate();
  const submitLock = useMemo(() => createSubmitLock(), []);
  const mountedRef = useRef(true);

  const [form, setForm] = useState(EMPTY_CREATE_EVENT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [venuesError, setVenuesError] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadVenues = useCallback(async () => {
    setVenuesLoading(true);
    setVenuesError("");
    try {
      const data = await getVenues();
      if (!mountedRef.current) return;
      const next = extractVenueList(data).map(normalizeVenue).filter(Boolean);
      setVenues(next);
    } catch (requestError) {
      if (!mountedRef.current) return;
      setVenues([]);
      setVenuesError(
        requestError.response?.data?.message ||
          "We could not load venues right now. Please try again."
      );
    } finally {
      if (mountedRef.current) setVenuesLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadVenues();
  }, [loadVenues]);

  const setValue = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleVenueChange = (event) => {
    const selected = venues.find((venue) => String(venue.id) === event.target.value);
    setValue("venueId", selected ? selected.id : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!submitLock.tryAcquire()) return;

    const errors = validateCreateEventForm(form);
    if (Object.keys(errors).length > 0) {
      submitLock.release();
      setFieldErrors(errors);
      setSubmitError("Please correct the highlighted fields before submitting.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setFieldErrors({});

    try {
      await createEvent(buildEventCreateRequest(form));
      if (!mountedRef.current) return;
      setSuccess(true);
    } catch (requestError) {
      if (!mountedRef.current) return;
      const status = requestError.response?.status;
      const apiMessage = requestError.response?.data?.message;
      if (status === 400) {
        setSubmitError(
          apiMessage || "The event could not be created. Check the details and try again."
        );
      } else if (status === 403) {
        setSubmitError("You do not have permission to create this event.");
      } else {
        setSubmitError(apiMessage || "The event could not be created. Please try again.");
      }
    } finally {
      submitLock.release();
      if (mountedRef.current) setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => {
      if (mountedRef.current) navigate("/organizer", { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const formLocked = submitting || venuesLoading;

  if (success) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-5">
        <section className="max-w-lg rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">Event created</h1>
          <p className="mt-2 text-slate-600" role="status">
            Your event has been created. Redirecting you to My Events…
          </p>
          <Link
            to="/organizer"
            className="mt-6 inline-block rounded-lg bg-sky-700 px-5 py-2.5 font-semibold text-white transition hover:bg-sky-800"
          >
            Go to My Events
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to My Events
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">Organizer</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Create Event</h1>
          <p className="mt-2 text-slate-600">
            Add a campus event. Ownership and approval status are assigned by the server after you
            submit.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {submitError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="grid gap-6">
            <Field id="event-name" label="Event name" error={fieldErrors.name}>
              {(describedBy) => (
                <input
                  id="event-name"
                  type="text"
                  value={form.name}
                  onChange={(event) => setValue("name", event.target.value)}
                  autoComplete="off"
                  disabled={formLocked}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={describedBy}
                  className={inputClass}
                />
              )}
            </Field>

            <Field
              id="event-description"
              label="Description"
              error={fieldErrors.description}
            >
              {(describedBy) => (
                <textarea
                  id="event-description"
                  value={form.description}
                  onChange={(event) => setValue("description", event.target.value)}
                  disabled={formLocked}
                  aria-invalid={Boolean(fieldErrors.description)}
                  aria-describedby={describedBy}
                  className={textareaClass}
                />
              )}
            </Field>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field id="event-category" label="Category" error={fieldErrors.category}>
                {(describedBy) => (
                  <select
                    id="event-category"
                    value={form.category}
                    onChange={(event) => setValue("category", event.target.value)}
                    disabled={formLocked}
                    aria-invalid={Boolean(fieldErrors.category)}
                    aria-describedby={describedBy}
                    className={inputClass}
                  >
                    <option value="">Select a category</option>
                    {EVENT_CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <Field
                id="event-capacity"
                label="Maximum attendance"
                error={fieldErrors.capacity}
                hint="How many students can register."
              >
                {(describedBy) => (
                  <input
                    id="event-capacity"
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={form.capacity}
                    onChange={(event) => setValue("capacity", event.target.value)}
                    disabled={formLocked}
                    aria-invalid={Boolean(fieldErrors.capacity)}
                    aria-describedby={describedBy}
                    className={inputClass}
                  />
                )}
              </Field>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Field id="event-date" label="Date" error={fieldErrors.date}>
                {(describedBy) => (
                  <input
                    id="event-date"
                    type="date"
                    value={form.date}
                    onChange={(event) => setValue("date", event.target.value)}
                    disabled={formLocked}
                    aria-invalid={Boolean(fieldErrors.date)}
                    aria-describedby={describedBy}
                    className={inputClass}
                  />
                )}
              </Field>

              <Field
                id="event-time"
                label="Time"
                error={fieldErrors.time}
                hint="Must be a future date and time."
              >
                {(describedBy) => (
                  <input
                    id="event-time"
                    type="time"
                    value={form.time}
                    onChange={(event) => setValue("time", event.target.value)}
                    disabled={formLocked}
                    aria-invalid={Boolean(fieldErrors.time)}
                    aria-describedby={describedBy}
                    className={inputClass}
                  />
                )}
              </Field>
            </div>

            <Field id="event-venue" label="Venue" error={fieldErrors.venueId}>
              {venuesLoading ? (
                <p className="flex h-11 items-center gap-2 text-sm text-slate-600" role="status">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading venues…
                </p>
              ) : venuesError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <p>{venuesError}</p>
                  <button
                    type="button"
                    onClick={loadVenues}
                    className="mt-3 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
                  >
                    Try again
                  </button>
                </div>
              ) : venues.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  No venues are available yet. You cannot create an event until venues are listed.
                </p>
              ) : (
                <select
                  id="event-venue"
                  value={form.venueId === "" || form.venueId == null ? "" : String(form.venueId)}
                  onChange={handleVenueChange}
                  disabled={formLocked}
                  aria-invalid={Boolean(fieldErrors.venueId)}
                  aria-describedby={fieldErrors.venueId ? "event-venue-error" : undefined}
                  className={inputClass}
                >
                  <option value="">Select a venue</option>
                  {venues.map((venue) => (
                    <option key={String(venue.id)} value={String(venue.id)}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              to="/organizer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={formLocked || Boolean(venuesError) || venues.length === 0}
              aria-busy={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                <>
                  <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                  Create event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
