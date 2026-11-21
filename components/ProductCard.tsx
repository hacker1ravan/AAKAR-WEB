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
      <Link href={`/products/${p.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius)] bg-[var(--surface-2)] ring-1 ring-[var(--line)] transition group-hover:ring-[var(--line-strong)]">
          <Photo
            src={p.images[0]}
            alt={p.name}
            width={500}
            sizes="(min-width: 768px) 25vw, 50vw"
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
          />
          {!inStock && <div className="absolute inset-0 bg-white/45" />}
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
            {!inStock && <Badge variant="soldout">Sold out</Badge>}
            {inStock && off > 0 && <Badge variant="sale">{off}% off</Badge>}
            {inStock && isNew && <Badge variant="new">New</Badge>}
          </div>
        </div>
        <h3 className="mt-3 text-sm font-medium leading-snug text-[var(--ink)] transition group-hover:text-[var(--accent)]">
          {p.name}
        </h3>
        <Price price={p.price} compare={p.comparePrice} className="mt-1 text-sm" />
      </Link>
      <div className="absolute right-2.5 top-2.5 opacity-90 transition group-hover:opacity-100">
        <HeartButton id={p.id} />
      </div>
    </div>
  );
}
