import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import HeaderActions from "./HeaderActions";
import MobileMenu from "./MobileMenu";
import { cld } from "@/lib/img";

export default async function Header() {
  const [s, cats] = await Promise.all([
    getSettings(),
    prisma.category.findMany({ where: { active: true }, orderBy: [{ position: "asc" }, { name: "asc" }] }),
  ]);
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/85 backdrop-blur-md">
      <div className="container-x flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3.5">
        <Link href="/" className="shrink-0 font-serif text-2xl font-semibold tracking-tight">
          {s.logoUrl ? (
            <img src={cld(s.logoUrl, 400)} alt={s.siteName} className="h-9 w-auto" />
          ) : (
            s.siteName
          )}
        </Link>
        <nav className="hidden flex-wrap items-center gap-x-5 gap-y-1 text-sm md:flex [&>*]:whitespace-nowrap">
          <Link href="/products" className="link-underline">Shop</Link>
          <HeaderActions />
        </nav>
        <MobileMenu />
      </div>
      {cats.length > 0 && (
        <div className="border-t border-[var(--line)]">
          <div className="container-x flex gap-2 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${encodeURIComponent(c.name)}`}
                className="chip"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
