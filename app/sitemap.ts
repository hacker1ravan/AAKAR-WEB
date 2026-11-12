import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await getSettings();
  const products = await prisma.product.findMany({ where: { active: true }, select: { id: true } });
  return [
    { url: s.siteUrl },
    { url: `${s.siteUrl}/products` },
    ...["privacy-policy", "terms", "shipping-policy", "return-policy", "contact"].map((p) => ({ url: `${s.siteUrl}/${p}` })),
    ...products.map((p) => ({ url: `${s.siteUrl}/products/${p.id}` })),
  ];
}
