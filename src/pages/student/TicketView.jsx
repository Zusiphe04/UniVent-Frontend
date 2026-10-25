import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CircleAlert,
  Clock,
  GraduationCap,
  MapPin,
  Printer,
  QrCode,
  RefreshCw,
  ShieldAlert,
  TicketX,
  UserRound,
} from "lucide-react";
import { getMyBookings } from "@/api/bookings";
import { getTicketByBooking } from "@/api/tickets";
import StatusBadge from "@/components/shared/StatusBadge";
import { primaryAction, secondaryAction } from "@/components/shared/StatusPage";
import { formatDate, formatTimeRange } from "@/lib/format";

/*
 * FE 61 Student Ticket View   (route: /student/tickets/:bookingId)
 *
 * What this page does:
 *   1. Reads the booking id from the address bar.
 *   2. Asks the backend for the ticket:   GET /api/tickets/booking/{bookingId}
 *      The backend only gives the ticket to the student who owns the booking.
 *   3. Also asks for the student's bookings:   GET /api/bookings/my
 *      The TicketDTO has no booking status, so we find this booking in that list
 *      to show its status (Registered / Cancelled ...) and its reference.
 *   4. Shows the ticket. "Print or save as PDF" opens the browser print window.
 *      The print CSS hides the navbar and footer so only the ticket is printed.
 *
 * Things that can go wrong are handled: 404 (no ticket), 403 (not your ticket),
 * network errors, and a cancelled booking.
 */

// Print rules: when printing, hide the Navbar, the footer and anything marked "no-print"
const PRINT_CSS = `
@media print {
  header, nav, footer, .no-print { display: none !important; }
  body, main { background: #ffffff !important; }
  .ticket-sheet { box-shadow: none !important; border: 1px solid #0f172a !important; break-inside: avoid; }
}
`;

const MISSING = "To be confirmed";

// issueDate arrives as "YYYY-MM-DD" (no time), so build the date from its parts.
// This avoids the browser shifting the day because of a time zone.
function formatIssueDate(value) {
  if (!value) return MISSING;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return MISSING;
  return formatDate(new Date(year, month - 1, day)) || MISSING;
}

// One label + value pair inside the ticket
function Detail({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={18} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-sm text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words font-medium text-slate-900">{children}</dd>
      </div>
    </div>
  );
}

// Grey placeholder with the same shape as the ticket, shown while loading
function TicketSkeleton() {
  const block = "rounded bg-slate-200 motion-safe:animate-pulse";
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="h-20 bg-slate-300 motion-safe:animate-pulse" />
      <div className="space-y-6 p-6 sm:p-8">
        <div className={`${block} h-8 w-3/4`} />
        <div className="grid gap-5 sm:grid-cols-2">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="space-y-2">
              <div className={`${block} h-3 w-20`} />
              <div className={`${block} h-5 w-40`} />
            </div>
          ))}
        </div>
        <div className={`${block} h-28 w-full`} />
      </div>
    </div>
  );
}

// Friendly message box for errors (404, 403, network, ...)
function ProblemBox({ icon: Icon, title, message, onRetry }) {
  return (
    <section role="alert" className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <Icon className="mx-auto text-slate-400" size={46} aria-hidden="true" />
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">{message}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className={`${primaryAction} inline-flex items-center gap-2`}>
            <RefreshCw size={17} aria-hidden="true" /> Try again
          </button>
        )}
        <Link to="/student/my-events" className={secondaryAction}>
          Back to My Events
        </Link>
      </div>
    </section>
  );
}

// Decides which problem message to show for a failed request
function problemFor(error) {
  const status = error?.response?.status;
  if (status === 404 || status === 400) {
    return {
      icon: TicketX,
      title: "Ticket not found",
      message: "We could not find a ticket for this booking. If you registered a moment ago, go back to My Events and try again.",
    };
  }
  if (status === 403) {
    return {
      icon: ShieldAlert,
      title: "This ticket is not yours",
      message: "You can only open tickets for events you registered for yourself.",
      noRetry: true,
    };
  }
  return {
    icon: CircleAlert,
    title: "We could not load the ticket",
    message: error?.response?.data?.message || "Something went wrong while loading your ticket.",
  };
}

function TicketContent({ bookingId }) {
  const [ticket, setTicket] = useState(null);
  const [booking, setBooking] = useState(null);
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0); // goes up by one every time the student clicks "Try again"

  // Load the ticket (and the booking details) when the page opens or on retry
  useEffect(() => {
    let stillOnPage = true;

    async function loadTicket() {
      try {
        // The bookings request is only "extra" information, so if it fails we still show the ticket
        const [ticketData, bookings] = await Promise.all([
          getTicketByBooking(bookingId),
          getMyBookings().catch(() => []),
        ]);
        if (!stillOnPage) return;
        const match = Array.isArray(bookings)
          ? bookings.find((item) => String(item.id) === String(bookingId))
          : null;
        setTicket(ticketData);
        setBooking(match ?? null);
        setProblem(null);
      } catch (error) {
        if (!stillOnPage) return;
        setTicket(null);
        setProblem(problemFor(error));
      } finally {
        if (stillOnPage) setLoading(false);
      }
    }

    loadTicket();

    // If the student leaves the page, ignore the answer when it arrives
    return () => {
      stillOnPage = false;
    };
  }, [bookingId, attempt]);

  function handleRetry() {
    setLoading(true);
    setProblem(null);
    setAttempt((current) => current + 1);
  }

  const cancelled = booking?.status === "CANCELLED";

  return (
    <main className="px-5 py-8 text-slate-950 sm:px-8">
      <style>{PRINT_CSS}</style>
      <div className="mx-auto max-w-3xl">
        {/* Top bar: back link and print button (not printed) */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/student/my-events" className={`${secondaryAction} inline-flex items-center gap-2 !py-2.5`}>
            <ArrowLeft size={18} aria-hidden="true" /> Back to My Events
          </Link>
          {ticket && (
            <button
              type="button"
              onClick={() => window.print()}
              disabled={cancelled}
              className={`${primaryAction} inline-flex items-center gap-2 !py-2.5 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Printer size={18} aria-hidden="true" /> Print or save as PDF
            </button>
          )}
        </div>

        {loading && <TicketSkeleton />}

        {!loading && problem && (
          <ProblemBox
            icon={problem.icon}
            title={problem.title}
            message={problem.message}
            onRetry={problem.noRetry ? undefined : handleRetry}
          />
        )}

        {!loading && ticket && (
          <>
            {cancelled && (
              <div
                role="alert"
                className="no-print mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800"
              >
                <Ban size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>
                  <span className="font-semibold">This booking was cancelled.</span> The ticket is not valid for entry
                  and cannot be printed.
                </p>
              </div>
            )}

            <article
              aria-label={`Ticket for ${ticket.eventName ?? "event"}`}
              className={`ticket-sheet overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${cancelled ? "opacity-60" : ""}`}
            >
              {/* Dark top band with the UniVent logo and the booking status */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 px-6 py-5 text-white sm:px-8">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-900">
                    <GraduationCap size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold leading-tight">UniVent</p>
                    <p className="text-sm text-slate-300">Event ticket</p>
                  </div>
                </div>
                {booking?.status && <StatusBadge status={booking.status} />}
              </div>

              <div className="p-6 sm:p-8">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{ticket.eventName || "Event"}</h1>

                <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Detail icon={CalendarDays} label="Date">
                    {formatDate(ticket.eventDateTime) || MISSING}
                  </Detail>
                  <Detail icon={Clock} label="Time">
                    {formatTimeRange(ticket.eventDateTime) || MISSING}
                  </Detail>
                  <Detail icon={MapPin} label="Venue">
                    {ticket.venue || MISSING}
                  </Detail>
                  <Detail icon={UserRound} label="Ticket holder">
                    {ticket.studentName || "—"}
                  </Detail>
                  <Detail icon={CalendarDays} label="Issued on">
                    {formatIssueDate(ticket.issueDate)}
                  </Detail>
                  <Detail icon={ShieldAlert} label="Entry">
                    {ticket.used ? "Already used" : "Not used yet"}
                  </Detail>
                </dl>

                {/* Dashed line like a tear-off ticket */}
                <div className="my-7 border-t-2 border-dashed border-slate-300" />

                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">Ticket code</p>
                    <p className="mt-1 break-all font-mono text-xl font-semibold tracking-wide">{ticket.ticketCode}</p>
                    {booking?.bookingReference && (
                      <p className="mt-3 text-sm text-slate-500">
                        Booking reference: <span className="font-mono text-slate-700">{booking.bookingReference}</span>
                      </p>
                    )}
                    <p className="mt-3 text-sm text-slate-500">Show this code at the entrance.</p>
                  </div>

                  {/* QR placeholder: QR generation is deferred (FE 61 allows this) */}
                  <div
                    role="img"
                    aria-label="QR code placeholder. QR codes are not available yet."
                    className="grid h-28 w-28 shrink-0 place-items-center rounded-lg border-2 border-dashed border-slate-300 text-center text-slate-400"
                  >
                    <div>
                      <QrCode size={32} className="mx-auto" aria-hidden="true" />
                      <span className="mt-1 block text-xs">QR coming soon</span>
                    </div>
                  </div>
                </div>

                {cancelled && (
                  <p className="mt-6 text-center text-2xl font-bold tracking-widest text-red-700">CANCELLED</p>
                )}
              </div>
            </article>
          </>
        )}
      </div>
    </main>
  );
}

// "key" makes React start with a fresh page every time the booking id in the address changes
export default function TicketView() {
  const { bookingId } = useParams();
  return <TicketContent key={bookingId} bookingId={bookingId} />;
}