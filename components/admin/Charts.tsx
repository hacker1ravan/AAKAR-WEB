type Point = { label: string; value: number; sub?: string };

export function BarChart({ data, format }: { data: Point[]; format: (n: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <div className="flex items-end gap-px h-40 border-b">
        {data.map((d) => (
          <div
            key={d.label}
            title={`${d.label}: ${format(d.value)}`}
            className="flex-1 bg-[var(--primary)] rounded-t min-h-[2px]"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function HBars({ rows, format }: { rows: Point[]; format: (n: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="text-sm">No sales in this period.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="text-sm">
          <div className="flex justify-between gap-2">
            <span className="truncate">{r.label}</span>
            <span className="whitespace-nowrap">{format(r.value)}{r.sub && ` · ${r.sub}`}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded">
            <div className="h-2 rounded bg-[var(--primary)]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
