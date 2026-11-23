import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import Price from "@/components/Price";
import AddToCart from "@/components/AddToCart";
import PincodeCheck from "@/components/PincodeCheck";
import SizeChart from "@/components/SizeChart";
import ProductCard from "@/components/ProductCard";
import HeartButton from "@/components/HeartButton";
import Reviews from "@/components/Reviews";
import Photo from "@/components/Photo";

type P = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id } });
  if (!p || !p.active) return {};
  return { title: p.name, description: p.description.slice(0, 160), openGraph: { images: p.images.slice(0, 1) }, alternates: { canonical: `/products/${p.id}` } };
}

export default async function ProductPage({ params }: P) {
  const { id } = await params;
  const p = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!p || !p.active) notFound();

  const user = (await getServerSession(authOptions))?.user as any;
  const variantIds = p.variants.map((v) => v.id);

  const [s, cat, related, reviews, bought, mine] = await Promise.all([
    getSettings(),
    prisma.category.findUnique({ where: { name: p.category } }),
    prisma.product.findMany({
      where: { active: true, category: p.category, NOT: { id: p.id } },
      include: { variants: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.review.findMany({ where: { productId: p.id, status: "approved" }, orderBy: { createdAt: "desc" }, take: 50 }),
    user
      ? prisma.order.findFirst({
          where: { userId: user.id, status: "delivered", items: { some: { variantId: { in: variantIds } } } },
          select: { id: true },
        })
      : null,
    user ? prisma.review.findUnique({ where: { productId_userId: { productId: p.id, userId: user.id } } }) : null,
  ]);

  // A product whose category has been switched off is not for sale.
  if (cat && !cat.active) notFound();

  const codOk = s.codEnabled && p.codAvailable && cat?.codAvailable !== false;
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;

  const inStock = p.variants.some((v) => v.stock > 0);
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description.slice(0, 500),
    image: p.images,
    category: p.category,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (p.price / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${s.siteUrl}/products/${p.id}`,
    },
    ...(reviews.length
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: avg.toFixed(1), reviewCount: reviews.length } }
      : {}),
  }).replace(/</g, "\\u003c");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <main className="container-x grid gap-8 py-8 md:grid-cols-2 md:gap-12">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {p.images.map((u, idx) => (
            <Photo key={u} src={u} alt={p.name} width={900} priority={idx === 0} sizes="(min-width: 768px) 50vw, 100vw" className="w-full shrink-0 snap-center rounded-[var(--radius-lg)] object-cover ring-1 ring-[var(--line)]" />
          ))}
        </div>
        <div className="space-y-5">
          <p className="eyebrow">{p.category}</p>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-serif text-3xl font-semibold tracking-tight md:text-4xl">{p.name}</h1>
            <HeartButton id={p.id} />
          </div>
          {reviews.length > 0 && (
            <p className="text-sm text-[var(--ink-soft)]">
              <span className="text-[var(--accent)]">★</span> {avg.toFixed(1)} ({reviews.length} review{reviews.length > 1 ? "s" : ""})
            </p>
          )}
          <Price price={p.price} compare={p.comparePrice} className="text-2xl" />
          <AddToCart
            product={{
              id: p.id, name: p.name, price: p.price, image: p.images[0],
              variants: p.variants.map(({ id, size, color, stock }) => ({ id, size, color, stock })),
            }}
          />
          <PincodeCheck />
          {s.codEnabled && (
            <p className="text-xs">
              {codOk ? "Cash on Delivery available (pincode permitting)" : "Cash on Delivery not available for this item"}
            </p>
          )}
          <SizeChart text={cat?.sizeChart ?? ""} />
          <div className="border-t border-[var(--line)] pt-5">
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--ink-soft)]">{p.description}</p>
          </div>
        </div>
      </main>

      <Reviews
        productId={p.id}
        reviews={reviews}
        canReview={!!bought}
        loggedIn={!!user}
        mine={mine ? { rating: mine.rating, comment: mine.comment, status: mine.status } : null}
      />

      {related.length > 0 && (
        <section className="container-x py-12">
          <h2 className="mb-6 font-serif text-2xl font-semibold tracking-tight">You may also like</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
            {related.map((r) => <ProductCard key={r.id} p={r} />)}
          </div>
        </section>
      )}
    </>
  );
}
