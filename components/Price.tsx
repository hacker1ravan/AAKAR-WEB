import { inr, discountPct } from "@/lib/format";

export default function Price({ price, compare = 0, className = "" }: { price: number; compare?: number; className?: string }) {
  const off = discountPct(price, compare);
  return (
    <span className={className}>
      <span className="font-semibold">{inr(price)}</span>
      {off > 0 && (
        <>
          <span className="ml-2 text-sm line-through opacity-60">{inr(compare)}</span>
          <span className="ml-2 text-sm text-green-700">{off}% off</span>
        </>
      )}
    </span>
  );
}
