/*
 * FE 62 StatCardSkeleton
 * Placeholder for a number card (label, big number, small note, icon box).
 *
 * Props
 *   variant   "compact" (default) matches the admin dashboard Metric card.
 *             "large" matches the bigger cards on the Student Home mockup.
 *   className optional extra classes (for example to fine-tune the height)
 *
 * Example:
 *   {loading ? <StatCardSkeleton /> : <Metric ... />}
 */
const block = "rounded bg-slate-200 motion-safe:animate-pulse";

const SIZES = {
  compact: { card: "p-5", label: "h-4 w-24", value: "mt-3 h-7 w-16", note: "mt-2 h-3 w-32", icon: "h-[39px] w-[39px]" },
  large: { card: "p-6", label: "h-4 w-32", value: "mt-5 h-9 w-20", note: "mt-4 h-3.5 w-40", icon: "h-[46px] w-[46px]" },
};

export default function StatCardSkeleton({ variant = "compact", className = "" }) {
  const size = SIZES[variant] ?? SIZES.compact;

  return (
    <article
      aria-hidden="true"
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${size.card} ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`${block} ${size.label}`} />
          <div className={`${block} ${size.value}`} />
          <div className={`${block} ${size.note}`} />
        </div>
        <div className={`${block} shrink-0 rounded-lg ${size.icon}`} />
      </div>
    </article>
  );
}