import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import HeaderActions from "./HeaderActions";
import { cld } from "@/lib/img";

export default async function Header() {
  const [s, cats] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);
  return (
    <header className="border-b sticky top-0 bg-white z-10">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 p-3">
        <Link href="/" className="font-bold text-lg shrink-0">
          {s.logoUrl ? <img src={cld(s.logoUrl, 400)} alt={s.siteName} className="h-8 w-auto" /> : s.siteName}
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm [&>*]:whitespace-nowrap">
          <Link href="/products">Shop</Link>
          <HeaderActions />
        </nav>
      </div>
      {cats.length > 0 && (
        <div className="max-w-6xl mx-auto flex gap-4 overflow-x-auto px-3 pb-2 text-sm">
          {cats.map((c) => (
            <Link key={c.id} href={`/products?category=${encodeURIComponent(c.name)}`} className="whitespace-nowrap">
              {c.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
