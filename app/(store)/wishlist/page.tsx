import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const metadata = { title: "Wishlist" };

export default async function Wishlist() {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user) redirect("/login");

  const rows = await prisma.wishlist.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.productId) }, active: true },
    include: { variants: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const list = rows.map((r) => byId.get(r.productId)).filter(Boolean) as typeof products;

  return (
    <main className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My wishlist</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {!list.length && <p className="text-center py-12">Nothing saved yet. Tap the heart on any product.</p>}
    </main>
  );
}
