import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ProductCard from "@/components/ProductCard";
import BannerSlider from "@/components/BannerSlider";
import HeroEditorial from "@/components/HeroEditorial";
import Photo from "@/components/Photo";

export default async function Home() {
  const now = new Date();
  // Products in a switched-off category are not for sale, so keep them out of the home page too.
  const allCats = await prisma.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] });
  const cats = allCats.filter((c) => c.active);
  const inactiveCatNames = allCats.filter((c) => !c.active).map((c) => c.name);

  const [s, banners, products] = await Promise.all([
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
    prisma.product.findMany({
      where: { active: true, ...(inactiveCatNames.length ? { NOT: { category: { in: inactiveCatNames } } } : {}) },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  // Editorial hero image for the no-banner fallback: feature the newest product,
  // or a category image, so the landing page looks finished out of the box.
  const heroImage =
    products.find((p) => p.images?.length)?.images[0] ||
    cats.find((c) => c.imageUrl)?.imageUrl ||
    null;

  return (
    <main>
      {banners.length > 0 ? (
        <BannerSlider banners={banners} />
      ) : (
        <HeroEditorial
          eyebrow={`Welcome to ${s.siteName}`}
          title={s.siteName}
          description={s.tagline || undefined}
          image={heroImage}
          imageAlt={s.siteName}
          primaryHref="/products"
          primaryLabel="Shop now"
          secondaryHref="/products"
          secondaryLabel="Browse the collection"
        />
      )}

      <section className="container-x py-12 md:py-16">
        {cats.length > 0 && (
          <>
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">Shop by category</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {cats.map((c) => (
                <Link
                  key={c.id}
                  href={`/products?category=${encodeURIComponent(c.name)}`}
                  className="group relative block aspect-square overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-2)] ring-1 ring-[var(--line)]"
                >
                  {c.imageUrl && (
                    <Photo
                      src={c.imageUrl}
                      alt={c.name}
                      width={500}
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-4 font-serif text-lg font-medium text-white">{c.name}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="mb-6 mt-14 flex items-end justify-between">
          <h2 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">New arrivals</h2>
          <Link href="/products" className="link-underline text-sm">View all</Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {!products.length && (
          <p className="py-16 text-center text-[var(--muted)]">Products will appear here once you add them in the admin panel.</p>
        )}
      </section>
    </main>
  );
}
