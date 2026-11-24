type Point = { label: string; value: number; sub?: string };

export function BarChart({ data, format }: { data: Point[]; format: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <figure className="m-0">
      <div className="relative">
        {/* The bars are a visual summary; the full values live in the sr-only
            table below so screen readers (and keyboard users) can read them. */}
        <div
          className="flex items-end gap-px h-40 border-b border-[var(--line)]"
          role="img"
          aria-label={`Bar chart, ${data.length} bars, highest value ${format(max)}.`}
        >
          {data.map((d) => (
            <div
              key={d.label}
              title={`${d.label}: ${format(d.value)}`}
              className="flex-1 bg-[var(--primary)] rounded-t min-h-[2px] transition-colors hover:bg-[var(--accent)]"
              style={{ height: `${(d.value / max) * 100}%` }}
            />
          ))}
        </div>
        <span className="pointer-events-none absolute right-0 top-0 text-[10px] leading-none text-[var(--muted)]">
          {format(max)}
        </span>
      </div>
      <div className="flex justify-between text-xs mt-1 text-[var(--ink-soft)]">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
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
  if (!rows.length) return <p className="text-sm text-[var(--ink-soft)]">No sales in this period.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{r.label}</span>
            <span className="whitespace-nowrap">{format(r.value)}{r.sub && ` · ${r.sub}`}</span>
          </div>
          <div className="h-2 bg-[var(--surface-2)] rounded">
            <div className="h-2 rounded bg-[var(--primary)]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
