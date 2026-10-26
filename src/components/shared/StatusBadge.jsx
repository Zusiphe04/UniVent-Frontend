import { Ban, BadgeCheck, CalendarClock, CircleCheck, CircleHelp, CirclePlay, CircleX, Clock, Hourglass } from "lucide-react";

/*
 * FE 52 Shared StatusBadge.
 * Maps backend enum values to user-facing labels WITHOUT changing the API value.
 * Meaning is carried by icon + text; colour is only a reinforcement.
 *
 * Booking:  PENDING, CONFIRMED (shown "Registered"), REGISTERED, WAITLISTED, CANCELLED
 * Event:    UPCOMING, ONGOING, COMPLETED, CANCELLED, APPROVED, DISABLED, PENDING_APPROVAL
 * WAITLISTED and PENDING_APPROVAL are provisional until BE 10 settles the final enum values.
 */
const TONES = {
  slate: "border-slate-300 bg-slate-100 text-slate-700",
  green: "border-emerald-200 bg-emerald-50 text-emerald-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  sky: "border-sky-200 bg-sky-50 text-sky-800",
  red: "border-red-200 bg-red-50 text-red-800",
};

const STATUS_MAP = { 
  PENDING: { label: "Pending", Icon: Clock, tone: "amber" },
  PENDING_APPROVAL: { label: "Pending approval", Icon: Clock, tone: "amber" },
  CONFIRMED: { label: "Registered", Icon: CircleCheck, tone: "slate" },
  REGISTERED: { label: "Registered", Icon: CircleCheck, tone: "slate" },
  WAITLISTED: { label: "Waitlisted", Icon: Hourglass, tone: "amber" },
  CANCELLED: { label: "Cancelled", Icon: CircleX, tone: "slate" },
  UPCOMING: { label: "Upcoming", Icon: CalendarClock, tone: "sky" },
  ONGOING: { label: "Ongoing", Icon: CirclePlay, tone: "green" },
  COMPLETED: { label: "Completed", Icon: CircleCheck, tone: "slate" },
  APPROVED: { label: "Approved", Icon: BadgeCheck, tone: "green" },
  ACTIVE: { label: "Active", Icon: BadgeCheck, tone: "green" },
  DISABLED: { label: "Disabled", Icon: Ban, tone: "red" },
};

const warned = new Set();

export default function StatusBadge({ status, className = "" }) {
  const known = STATUS_MAP[status];
  if (!known && import.meta.env.DEV && !warned.has(status)) {
    warned.add(status);
    console.warn(`StatusBadge: unknown status "${status}". Add it to STATUS_MAP.`);
  }
  const { label, Icon, tone } = known ?? { label: status ? String(status) : "Unknown", Icon: CircleHelp, tone: "slate" };

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${TONES[tone]} ${className}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}