import { z } from "zod";
import { isStateCode } from "./gst";

export const productSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1),
    price: z.number().int().positive(), // paise
    comparePrice: z.number().int().min(0), // MRP in paise, 0 = no sale
    category: z.string().trim().min(1),
    images: z.array(z.string().url()).min(1),
    codAvailable: z.boolean(),
    active: z.boolean(),
    gstRate: z.number().int().min(0).max(40),
    hsnCode: z.string().trim().regex(/^(\d{4,8})?$/, "HSN code must be 4 to 8 digits"),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          size: z.string().trim().min(1),
          color: z.string().trim().min(1),
          stock: z.number().int().min(0),
        })
      )
      .min(1),
  })
  .refine((d) => d.comparePrice === 0 || d.comparePrice > d.price, {
    path: ["comparePrice"],
    message: "MRP must be higher than the selling price",
  });

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  imageUrl: z.union([z.string().url(), z.literal("")]),
  position: z.number().int().min(0),
  active: z.boolean(),
  codAvailable: z.boolean(),
  sizeChart: z.string().max(3000),
});

export const couponSchema = z
  .object({
    code: z.string().trim().regex(/^[A-Za-z0-9]{3,20}$/, "letters and numbers only"),
    type: z.enum(["percent", "fixed"]),
    value: z.number().int().positive(),
    minOrder: z.number().int().min(0),
    maxDiscount: z.number().int().min(0),
    usageLimit: z.number().int().min(0),
    perUserLimit: z.number().int().min(0),
    expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    active: z.boolean(),
  })
  .refine((d) => d.type !== "percent" || d.value <= 100, { path: ["value"], message: "max 100" });

export const couponData = (b: z.infer<typeof couponSchema>) => ({
  ...b,
  code: b.code.toUpperCase(),
  expiresAt: b.expiresAt ? new Date(`${b.expiresAt}T23:59:59+05:30`) : null,
});

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
// must start with / (not //) or https://, so javascript: links are impossible
const link = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^(\/(?!\/)|https?:\/\/)/.test(v), "Link must start with / or https://");

export const bannerSchema = z
  .object({
    imageUrl: z.string().url(),
    title: z.string().trim().max(80),
    subtitle: z.string().trim().max(160),
    buttonText: z.string().trim().max(30),
    linkUrl: link,
    position: z.number().int().min(0),
    active: z.boolean(),
    startsAt: dateOnly.nullable(),
    endsAt: dateOnly.nullable(),
  })
  .refine((d) => !d.startsAt || !d.endsAt || d.startsAt <= d.endsAt, {
    path: ["endsAt"],
    message: "End date must be after start date",
  });

export const bannerData = (b: z.infer<typeof bannerSchema>) => ({
  ...b,
  startsAt: b.startsAt ? new Date(`${b.startsAt}T00:00:00+05:30`) : null,
  endsAt: b.endsAt ? new Date(`${b.endsAt}T23:59:59+05:30`) : null,
});

export const addressSchema = z.object({
  label: z.string().trim().max(30),
  name: z.string().trim().min(1).max(80),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Mobile number must be 10 digits"),
  pincode: z.string().regex(/^[1-9]\d{5}$/, "Pincode must be 6 digits"),
  state: z.string().refine(isStateCode, "Choose a state"),
  address: z.string().trim().min(10, "Enter the full address").max(300),
  isDefault: z.boolean(),
});
