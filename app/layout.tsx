import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { cld } from "@/lib/img";
import Providers from "./providers";
import { getSettings } from "@/lib/settings";

// Settings live in the database, so render pages on request instead of at build time.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.metaTitle || s.siteName;
  return {
    metadataBase: new URL(s.siteUrl),
    title: { default: title, template: `%s | ${s.siteName}` },
    description: s.metaDescription,
    keywords: s.metaKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    icons: s.faviconUrl ? { icon: cld(s.faviconUrl, 64), apple: cld(s.faviconUrl, 180) } : undefined,
    robots: s.allowIndexing ? undefined : { index: false, follow: false },
    verification: s.searchConsoleCode ? { google: s.searchConsoleCode } : undefined,
    openGraph: {
      title,
      description: s.metaDescription,
      siteName: s.siteName,
      images: s.ogImageUrl ? [s.ogImageUrl] : [],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <html lang="en">
      <body
        style={
          {
            "--primary": s.primaryColor,
            "--secondary": s.secondaryColor,
            "--accent": s.accentColor,
          } as CSSProperties
        }
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
