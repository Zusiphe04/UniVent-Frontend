/*
 * FE 62 EventCardSkeleton
 * A grey "placeholder" that looks like EventCard while the real events are loading.
 * It copies the EventCard sizes exactly (image h-44, title area 3.5rem, three detail
 * lines, description area 3rem, button h-12), so the page does not jump when the
 * real cards appear.
 *
 * The pulse animation only runs when the user has NOT asked their device for reduced
 * motion (motion-safe). Otherwise the grey blocks are simply still.
 *
 * Use it inside the same grid as the real cards:
 *   <section aria-label="Loading events" aria-busy="true" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
 *     {[1, 2, 3].map((item) => <EventCardSkeleton key={item} />)}
 *   </section>
 */
const block = "rounded bg-slate-200 motion-safe:animate-pulse";

export default function EventCardSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Image area (same height as EventCard) */}
      <div className="h-44 shrink-0 bg-slate-200 motion-safe:animate-pulse" />

      <div className="flex flex-1 flex-col p-5">
        {/* Title: two lines */}
        <div className="min-h-[3.5rem] space-y-3 pt-1">
          <div className={`${block} h-4 w-4/5`} />
          <div className={`${block} h-4 w-3/5`} />
        </div>

        {/* Date, time and venue lines */}
        <ul className="mt-3 space-y-1.5">
          {[1, 2, 3].map((item) => (
            <li key={item} className="flex h-6 items-center gap-2.5">
              <div className={`${block} h-[18px] w-[18px] shrink-0`} />
              <div className={`${block} h-4 w-2/5`} />
            </li>
          ))}
        </ul>

        {/* Description: two lines */}
        <div className="mt-3 min-h-[3rem] space-y-2.5 pt-1">
          <div className={`${block} h-3.5 w-full`} />
          <div className={`${block} h-3.5 w-2/3`} />
        </div>

        {/* View Details button */}
        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className={`${block} h-12 w-full rounded-lg`} />
        </div>
      </div>
    </article>
  );
}