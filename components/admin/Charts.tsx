type Point = { label: string; value: number; sub?: string };

/* Visual-only chart primitives for the admin Sales page.
   Same public contract as before: BarChart({data,format}) + HBars({rows,format}),
   Point = {label,value,sub?}. No data/behaviour here — only presentation.
   Server-safe (no "use client"): all interactivity is CSS hover/focus. */

export function BarChart({ data, format }: { data: Point[]; format: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const hasData = data.some((d) => d.value > 0);
  const gridlines = [1, 0.75, 0.5, 0.25]; // faint horizontal reference lines

  return (
    <figure className="m-0">
      {/* y-axis max tick + plot area */}
      <div className="relative pl-1 pr-10">
        {/* value ticks on the right edge */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 text-[10px] leading-none text-[var(--muted)]">
          {gridlines.map((g) => (
            <span
              key={g}
              className="absolute right-0 -translate-y-1/2 tabular-nums"
              style={{ top: `${(1 - g) * 100}%` }}
            >
              {format(Math.round(max * g))}
            </span>
          ))}
          <span className="absolute right-0 bottom-0 translate-y-1/2 tabular-nums">0</span>
        </div>

        {/* The bars are a visual summary; the full values live in the sr-only
            table below so screen readers (and keyboard users) can read them. */}
        <div className="relative h-44">
          {/* gridlines behind the bars */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {gridlines.map((g) => (
              <div
                key={g}
                className="absolute inset-x-0 border-t border-dashed border-[var(--line)]"
                style={{ top: `${(1 - g) * 100}%` }}
              />
            ))}
          </div>

          <div
            className="absolute inset-0 flex items-end gap-[2px] border-b border-[var(--line-strong)]"
            role="img"
            aria-label={`Bar chart, ${data.length} bars, highest value ${format(max)}.`}
          >
            {data.map((d, i) => (
              <div key={d.label + i} className="group/bar relative flex-1 h-full flex items-end">
                {/* hover / focus tooltip (CSS-only) */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--ink)] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover/bar:opacity-100 group-focus-within/bar:opacity-100">
                  <span className="opacity-70">{d.label}</span> · {format(d.value)}
                </div>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  title={`${d.label}: ${format(d.value)}`}
                  className="relative w-full min-h-[2px] rounded-t-sm bg-[var(--primary)] transition-[filter,opacity] duration-150 hover:brightness-110 group-hover/bar:brightness-110"
                  style={{
                    height: `${(d.value / max) * 100}%`,
                    background:
                      "linear-gradient(to top, var(--primary), color-mix(in oklab, var(--primary) 62%, var(--accent)))",
                  }}
                />
              </div>
            ))}
          </div>

          {!hasData && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-[var(--ink-soft)]">No revenue in this period.</p>
            </div>
          )}
        </div>
      </div>

      {/* x-axis: first · middle · last for time context */}
      <figcaption className="mt-1.5 flex justify-between pl-1 pr-10 text-xs text-[var(--ink-soft)] tabular-nums">
        <span>{data[0]?.label}</span>
        {data.length > 2 && <span className="hidden sm:inline">{data[Math.floor((data.length - 1) / 2)]?.label}</span>}
        <span>{data[data.length - 1]?.label}</span>
      </figcaption>

      <table className="sr-only">
        <caption>Chart data</caption>
        <thead>
          <tr><th>Label</th><th>Value</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{format(d.value)}{d.sub ? ` (${d.sub})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function HBars({ rows, format }: { rows: Point[]; format: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length)
    return (
      <div className="flex h-24 items-center justify-center rounded-[var(--radius-sm)] border border-dashed border-[var(--line)] bg-[var(--surface-2)]">
        <p className="text-sm text-[var(--ink-soft)]">No sales in this period.</p>
      </div>
    );
  return (
    <ol className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.label} className="group text-sm">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="w-4 shrink-0 text-right text-xs tabular-nums text-[var(--muted)]">{i + 1}</span>
              <span className="truncate text-[var(--ink)]">{r.label}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap tabular-nums">
              <b className="text-[var(--ink)]">{format(r.value)}</b>
              {r.sub && <span className="text-[var(--muted)]"> · {r.sub}</span>}
            </span>
          </div>
          <div className="ml-[22px] h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--line)]">
            <div
              className="h-full min-w-[3px] rounded-full transition-[filter] duration-150 group-hover:brightness-110"
              style={{
                width: `${(r.value / max) * 100}%`,
                background:
                  "linear-gradient(to right, color-mix(in oklab, var(--primary) 70%, var(--accent)), var(--accent))",
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
