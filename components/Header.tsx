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
  const action =
    "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[var(--ink-soft)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]";
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/80 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/70">
      <div className="container-x flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5">
        <Link href="/" className="shrink-0 font-serif text-2xl font-semibold tracking-tight">
          {s.logoUrl ? (
            <img src={cld(s.logoUrl, 400)} alt={s.siteName} className="h-9 w-auto" />
          ) : (
            s.siteName
          )}
        </Link>
        <nav className="hidden flex-wrap items-center gap-x-1 gap-y-1 text-sm md:flex [&>*]:whitespace-nowrap">
          <Link href="/products" className={action}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9h18M3 9l1.5-5h15L21 9M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
            </svg>
            <span>Shop</span>
          </Link>
          <HeaderActions />
        </nav>
        <MobileMenu />
      </div>
      {cats.length > 0 && (
        <div className="border-t border-[var(--line)] bg-[var(--surface)]/60">
          <div className="container-x flex gap-2 overflow-x-auto py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/products" className="chip shrink-0">All</Link>
            {cats.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${encodeURIComponent(c.name)}`}
                className="chip shrink-0"
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
