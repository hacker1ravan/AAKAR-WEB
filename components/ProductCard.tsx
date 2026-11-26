import Link from "next/link";
import Price from "./Price";
import HeartButton from "./HeartButton";
import Badge from "./ui/Badge";
import { discountPct } from "@/lib/format";
import Photo from "./Photo";

export default function ProductCard({ p }: { p: any }) {
  const inStock = p.variants.some((v: any) => v.stock > 0);
  const off = discountPct(p.price, p.comparePrice);
  const isNew = p.createdAt && Date.now() - new Date(p.createdAt).getTime() < 14 * 86400000;

  return (
    <div className="group relative">
      <Link
        href={`/products/${p.id}`}
        className="block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] transition duration-300 ease-out group-hover:-translate-y-1 group-hover:border-[var(--line-strong)] group-hover:shadow-[var(--shadow-md)]"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-[var(--surface-2)]">
          <Photo
            src={p.images[0]}
            alt={p.name}
            width={500}
            sizes="(min-width: 768px) 25vw, 50vw"
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
          />
          {/* Subtle depth on hover */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

          {!inStock && (
            <div className="absolute inset-0 grid place-items-center bg-[var(--surface)]/60 backdrop-blur-[1px]">
              <span className="badge badge-soldout">Sold out</span>
            </div>
          )}

          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {inStock && off > 0 && <Badge variant="sale">{off}% off</Badge>}
            {inStock && isNew && <Badge variant="new">New</Badge>}
          </div>
        </div>

        <div className="px-3 pb-3.5 pt-3">
          {p.category && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{p.category}</p>
          )}
          <h3 className="text-sm font-medium leading-snug text-[var(--ink)] line-clamp-1 transition group-hover:text-[var(--accent)]">
            {p.name}
          </h3>
          <Price price={p.price} compare={p.comparePrice} className="mt-1.5 text-sm" />
        </div>
      </Link>

      <div className="absolute right-2.5 top-2.5 opacity-95 transition group-hover:opacity-100">
        <HeartButton id={p.id} />
      </div>
    </div>
  );
}
