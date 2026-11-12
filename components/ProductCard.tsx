import Link from "next/link";
import Price from "./Price";
import HeartButton from "./HeartButton";
import { discountPct } from "@/lib/format";
import Photo from "./Photo";

export default function ProductCard({ p }: { p: any }) {
  const inStock = p.variants.some((v: any) => v.stock > 0);
  const off = discountPct(p.price, p.comparePrice);
  const isNew = p.createdAt && Date.now() - new Date(p.createdAt).getTime() < 14 * 86400000;
  const tag = "text-xs px-2 py-0.5 rounded text-white";

  return (
    <div className="relative">
      <Link href={`/products/${p.id}`} className="block group">
        <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden rounded">
          <Photo src={p.images[0]} alt={p.name} width={500} sizes="(min-width: 768px) 25vw, 50vw" className="w-full h-full object-cover group-hover:scale-105 transition" />
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {!inStock && <span className={`${tag} bg-gray-700`}>Sold out</span>}
            {inStock && off > 0 && <span className={`${tag} bg-[var(--accent)]`}>{off}% OFF</span>}
            {inStock && isNew && <span className={`${tag} bg-black`}>New</span>}
          </div>
        </div>
        <p className="mt-2 text-sm">{p.name}</p>
        <Price price={p.price} compare={p.comparePrice} />
      </Link>
      <div className="absolute top-2 right-2"><HeartButton id={p.id} /></div>
    </div>
  );
}
