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
  return (
    <footer className="border-t mt-12 p-6 text-sm text-center space-y-2">
      <p className="font-semibold">{s.siteName}</p>
      {s.tagline && <p>{s.tagline}</p>}
      <p>{[s.contactEmail, s.contactPhone].filter(Boolean).join(" · ")}</p>
      <p className="space-x-3">
        {links.map(([t, h]) => (
          <Link key={h} href={h} className="underline">{t}</Link>
        ))}
        {s.googleAnalyticsId.trim() && <CookieSettings />}
        {s.instagramUrl && <a href={s.instagramUrl} target="_blank" rel="noopener noreferrer" className="underline">Instagram</a>}
        {s.facebookUrl && <a href={s.facebookUrl} target="_blank" rel="noopener noreferrer" className="underline">Facebook</a>}
      </p>
    </footer>
  );
}
