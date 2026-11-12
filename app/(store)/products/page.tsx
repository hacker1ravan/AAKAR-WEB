import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";

type SP = Record<string, string | undefined>;
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const paise = (x?: string) => (x && !isNaN(Number(x)) ? Math.round(Number(x) * 100) : undefined);
const box = "border p-2 rounded";
const PAGE_SIZE = 12;

export const metadata = { title: "Shop" };

// Link to another page of the same search, keeping every filter
function pageHref(sp: SP, page: number) {
  const q = new URLSearchParams();
  for (const [k, val] of Object.entries(sp)) if (val && k !== "page") q.set(k, val);
  q.set("page", String(page));
  return `/products?${q.toString()}`;
}

export default async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const min = paise(sp.min);
  const max = paise(sp.max);

  const where: Prisma.ProductWhereInput = {
    active: true,
    ...(sp.q ? { OR: [
      { name: { contains: sp.q, mode: "insensitive" as const } },
      { description: { contains: sp.q, mode: "insensitive" as const } },
    ] } : {}),
    ...(sp.category ? { category: sp.category } : {}),
    ...(min !== undefined || max !== undefined ? { price: { gte: min, lte: max } } : {}),
    ...(sp.sale ? { comparePrice: { gt: 0 } } : {}),
    ...(sp.size || sp.color ? { variants: { some: {
      stock: { gt: 0 },
      ...(sp.size ? { size: sp.size } : {}),
      ...(sp.color ? { color: { equals: sp.color, mode: "insensitive" as const } } : {}),
    } } } : {}),
  };
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sp.sort === "price_asc" ? { price: "asc" } : sp.sort === "price_desc" ? { price: "desc" } : { createdAt: "desc" };

  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(sp.page)) || 1), pages);

  const [products, cats] = await Promise.all([
    prisma.product.findMany({ where, orderBy: [orderBy, { id: "asc" }], include: { variants: true }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <main className="max-w-6xl mx-auto p-4">
      <form className="grid grid-cols-2 md:grid-cols-8 gap-2 mb-6 text-sm">
        <input name="q" defaultValue={sp.q} placeholder="Search" aria-label="Search" className={`${box} col-span-2`} />
        <select name="category" defaultValue={sp.category ?? ""} aria-label="Category" className={box}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
        <select name="size" defaultValue={sp.size ?? ""} aria-label="Size" className={box}>
          <option value="">Any size</option>
          {SIZES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input name="color" defaultValue={sp.color} placeholder="Colour" aria-label="Colour" className={box} />
        <input name="min" type="number" defaultValue={sp.min} placeholder="Min ₹" aria-label="Minimum price" className={box} />
        <input name="max" type="number" defaultValue={sp.max} placeholder="Max ₹" aria-label="Maximum price" className={box} />
        <select name="sort" defaultValue={sp.sort ?? ""} aria-label="Sort" className={box}>
          <option value="">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        <label className="col-span-2 flex items-center gap-2">
          <input type="checkbox" name="sale" value="1" defaultChecked={!!sp.sale} /> On sale only
        </label>
        <button className="col-span-2 md:col-span-8 bg-[var(--primary)] text-[var(--secondary)] rounded p-2">Apply filters</button>
      </form>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {!products.length && <p className="text-center py-12">No products found. Try removing a filter.</p>}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-4 mt-8 text-sm" aria-label="Pages">
          {page > 1 ? <Link href={pageHref(sp, page - 1)} className="border rounded px-3 py-1">Previous</Link> : <span className="opacity-40 border rounded px-3 py-1">Previous</span>}
          <span>Page {page} of {pages} ({total} products)</span>
          {page < pages ? <Link href={pageHref(sp, page + 1)} className="border rounded px-3 py-1">Next</Link> : <span className="opacity-40 border rounded px-3 py-1">Next</span>}
        </nav>
      )}
    </main>
  );
}
