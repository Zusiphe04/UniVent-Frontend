/*
 * FE 62 TableRowSkeleton
 * Placeholder table rows for the admin / organizer tables while data is loading.
 * It matches the real rows: every cell has px-3 py-4, like the real <td> cells.
 *
 * Props
 *   columns  how many cells per row (use the same number as your <th> headings)
 *   rows     how many placeholder rows to draw (default 5)
 *   lines    1 = one grey bar per cell, 2 = a second thin bar under it, for
 *            cells that show a title plus a small description
 *
 * It returns <tr> elements, so put it INSIDE <tbody>:
 *   <tbody>
 *     {loading && <TableRowSkeleton columns={7} rows={5} lines={2} />}
 *     {!loading && events.map(...)}
 *   </tbody>
 */
const block = "rounded bg-slate-200 motion-safe:animate-pulse";

// A few different widths so the rows look natural instead of one solid block
const WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-1/3", "w-3/5", "w-2/5", "w-4/5"];

export default function TableRowSkeleton({ columns = 5, rows = 5, lines = 1 }) {
  const rowList = Array.from({ length: rows }, (_, rowIndex) => rowIndex);
  const cellList = Array.from({ length: columns }, (_, cellIndex) => cellIndex);

  return (
    <>
      {rowList.map((rowIndex) => (
        <tr key={rowIndex} aria-hidden="true" className="border-b border-slate-100">
          {cellList.map((cellIndex) => (
            <td key={cellIndex} className="px-3 py-4">
              <div className={`${block} h-4 ${WIDTHS[(rowIndex + cellIndex) % WIDTHS.length]}`} />
              {lines > 1 && <div className={`${block} mt-2 h-3 w-1/2`} />}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}