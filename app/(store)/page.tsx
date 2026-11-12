import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ProductCard from "@/components/ProductCard";
import BannerSlider from "@/components/BannerSlider";
import Photo from "@/components/Photo";

export default async function Home() {
  const now = new Date();
  const [s, banners, products, cats] = await Promise.all([
    getSettings(),
    prisma.banner.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ position: "asc" }, { id: "desc" }],
    }),
    prisma.product.findMany({ where: { active: true }, include: { variants: true }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);

  return (
    <main>
      {banners.length > 0 ? (
        <BannerSlider banners={banners} />
      ) : (
        <section className="text-center py-16 px-4 bg-[var(--primary)] text-[var(--secondary)]">
          <h1 className="text-3xl md:text-5xl font-bold">{s.siteName}</h1>
          {s.tagline && <p className="mt-2">{s.tagline}</p>}
          <Link href="/products" className="inline-block mt-6 px-6 py-3 rounded bg-[var(--accent)] text-white">Shop now</Link>
        </section>
      )}

      <section className="max-w-6xl mx-auto p-4">
        {cats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
            {cats.map((c) => (
              <Link key={c.id} href={`/products?category=${encodeURIComponent(c.name)}`}
                className="relative block aspect-square rounded overflow-hidden bg-gray-100">
                {c.imageUrl && <Photo src={c.imageUrl} alt={c.name} width={500} sizes="(min-width: 768px) 25vw, 50vw" className="w-full h-full object-cover" />}
                <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-center p-2 text-sm">{c.name}</span>
              </Link>
            ))}
          </div>
        )}
        <h2 className="text-xl font-semibold my-4">New arrivals</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {!products.length && <p className="text-center py-12">Products will appear here once you add them in the admin panel.</p>}
      </section>
    </main>
  );
}
