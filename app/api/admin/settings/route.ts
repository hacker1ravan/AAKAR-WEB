import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GSTIN_PATTERN } from "@/lib/gst";
import { couriersProblem } from "@/lib/couriers";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";
import { getSettings } from "@/lib/settings";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const optUrl = z.union([z.string().url(), z.literal("")]);

const schema = z.object({
  siteName: z.string().trim().min(1),
  tagline: z.string(),
  logoUrl: optUrl,
  faviconUrl: optUrl,
  primaryColor: hex,
  secondaryColor: hex,
  accentColor: hex,
  metaTitle: z.string().max(70),
  metaDescription: z.string().max(160),
  metaKeywords: z.string(),
  ogImageUrl: optUrl,
  siteUrl: z.string().url(),
  allowIndexing: z.boolean(),
  googleAnalyticsId: z.string(),
  searchConsoleCode: z.string(),
  contactEmail: z.string().email(),
  contactPhone: z.string(),
  address: z.string(),
  instagramUrl: optUrl,
  facebookUrl: optUrl,
  announcement: z.string(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string(),
  returnWindowDays: z.number().int().min(0).max(90),
  returnPolicy: z.string(),
  shippingFlatRate: z.number().int().min(0),
  freeShippingAbove: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).max(1000),
  codEnabled: z.boolean(),
  codFee: z.number().int().min(0),
  codMaxOrder: z.number().int().min(0),
  deliveryPincodes: z.string(),
  codPincodes: z.string(),
  gstin: z.string().trim().toUpperCase().refine((v) => v === "" || GSTIN_PATTERN.test(v), "Enter a valid 15-character GSTIN"),
  couriers: z.string().max(2000).superRefine((v, ctx) => {
    const problem = couriersProblem(v);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  }),
  invoicePrefix: z.string().trim().max(10),
  gstOnShipping: z.number().int().min(0).max(40),
  whatsappNumber: z.string().regex(/^\d{0,15}$/, "digits only"),
});

export const GET = adminRoute(async () => ok(await getSettings()));

export const PUT = adminRoute(async (_, { body }) => {
  const data = { ...body, siteUrl: body.siteUrl.replace(/\/$/, "") };
  const saved = await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });
  revalidatePath("/", "layout");
  return ok(saved);
}, schema);
