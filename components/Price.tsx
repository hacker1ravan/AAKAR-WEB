import { inr, discountPct } from "@/lib/format";

export default function Price({ price, compare = 0, className = "" }: { price: number; compare?: number; className?: string }) {
  const off = discountPct(price, compare);
  return (
    <span className={`inline-flex items-baseline flex-wrap gap-x-2 gap-y-0.5 ${className}`}>
      <span className="font-semibold tracking-tight text-[var(--ink)]">{inr(price)}</span>
      {off > 0 && (
        <>
          <span className="text-sm line-through text-[var(--muted)]">{inr(compare)}</span>
          <span className="text-xs font-semibold text-emerald-700">{off}% off</span>
        </>
      )}
    </span>
  );
}
