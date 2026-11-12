import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const s = await getSettings();
  return {
    rules: s.allowIndexing
      ? { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/invoice"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: `${s.siteUrl}/sitemap.xml`,
  };
}
