import Link from "next/link";
import { getSettings } from "@/lib/settings";
import CookieSettings from "./CookieSettings";

const links = [
  ["Privacy", "/privacy-policy"],
  ["Terms", "/terms"],
  ["Shipping", "/shipping-policy"],
  ["Returns", "/return-policy"],
  ["Contact", "/contact"],
];

export default async function Footer() {
  const s = await getSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-[var(--line)] bg-[var(--surface-2)]">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-2">
          <p className="font-serif text-xl font-semibold tracking-tight">{s.siteName}</p>
          {s.tagline && <p className="mt-2 max-w-sm text-sm text-[var(--ink-soft)]">{s.tagline}</p>}
        </div>

        <div>
          <p className="eyebrow mb-3">Help</p>
          <ul className="space-y-2 text-sm">
            {links.map(([t, h]) => (
              <li key={h}>
                <Link href={h} className="text-[var(--ink-soft)] transition hover:text-[var(--ink)]">{t}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-3">Get in touch</p>
          <ul className="space-y-2 text-sm text-[var(--ink-soft)]">
            {s.contactEmail && (
              <li><a href={`mailto:${s.contactEmail}`} className="transition hover:text-[var(--ink)]">{s.contactEmail}</a></li>
            )}
            {s.contactPhone && (
              <li><a href={`tel:${s.contactPhone}`} className="transition hover:text-[var(--ink)]">{s.contactPhone}</a></li>
            )}
            {s.instagramUrl && (
              <li><a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--ink)]">Instagram</a></li>
            )}
            {s.facebookUrl && (
              <li><a href={s.facebookUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-[var(--ink)]">Facebook</a></li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-[var(--line)]">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-[var(--muted)] sm:flex-row">
          <p>© {year} {s.siteName}. All rights reserved.</p>
          {s.googleAnalyticsId.trim() && <CookieSettings />}
        </div>
      </div>
    </footer>
  );
}
