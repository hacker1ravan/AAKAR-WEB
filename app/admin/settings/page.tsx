"use client";
import { useEffect } from "react";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { Section, TextField, CheckField, ColorField, ImageField, SubmitButton } from "@/components/ui/fields";

export default function SettingsPage() {
  const { values: s, setValues, field } = useForm<Record<string, any>>({});
  const { run, loading, msg } = useAction();

  // Money is stored in paise but edited in rupees
  useEffect(() => {
    api("/api/admin/settings").then((d) =>
      setValues({
        ...d,
        shippingFlatRate: d.shippingFlatRate / 100,
        freeShippingAbove: d.freeShippingAbove / 100,
        codFee: d.codFee / 100,
        codMaxOrder: d.codMaxOrder / 100,
      })
    );
  }, [setValues]);
  if (!s.siteName) return <p className="p-6">Loading...</p>;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const { id, updatedAt, ...rest } = s;
    const body = {
      ...rest,
      returnWindowDays: Number(rest.returnWindowDays),
      lowStockThreshold: Number(rest.lowStockThreshold),
      gstOnShipping: Number(rest.gstOnShipping),
      shippingFlatRate: Math.round(Number(rest.shippingFlatRate) * 100),
      freeShippingAbove: Math.round(Number(rest.freeShippingAbove) * 100),
      codFee: Math.round(Number(rest.codFee) * 100),
      codMaxOrder: Math.round(Number(rest.codMaxOrder) * 100),
    };
    run(() => api("/api/admin/settings", "PUT", body));
  };

  return (
    <form onSubmit={save} className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Store Settings</h1>

      <Section title="General">
        <TextField label="Website name" required {...field("siteName")} />
        <TextField label="Tagline" {...field("tagline")} />
        <TextField label="Site URL (https://yourstore.com)" required {...field("siteUrl")} />
        <TextField label="Contact email (order alerts are sent here)" type="email" required {...field("contactEmail")} />
        <TextField label="Phone" {...field("contactPhone")} />
        <TextField label="Business address (shown on invoices and return emails)" rows={3} {...field("address")} />
        <TextField label="Instagram URL" {...field("instagramUrl")} />
        <TextField label="Facebook URL" {...field("facebookUrl")} />
        <TextField label="Announcement bar text (empty = hidden)" {...field("announcement")} />
      </Section>

      <Section title="Branding">
        <ImageField label="Store logo" hint="Shown in the site header, emails and invoices. A PNG or SVG with a transparent background, about 400 wide by 100 high, works best. Click Save settings after uploading." {...field("logoUrl")} />
        <ImageField label="Favicon (the small icon in the browser tab)" hint="A square image, at least 64 x 64 pixels (PNG works best). Click Save settings after uploading; browsers can take a while to show a new favicon." {...field("faviconUrl")} />
        <ColorField label="Primary colour" {...field("primaryColor")} />
        <ColorField label="Secondary colour" {...field("secondaryColor")} />
        <ColorField label="Accent colour" {...field("accentColor")} />
      </Section>

      <Section title="SEO">
        <TextField label="Meta title (max 70)" {...field("metaTitle")} />
        <TextField label="Meta description (max 160)" rows={3} {...field("metaDescription")} />
        <TextField label="Meta keywords (comma separated)" {...field("metaKeywords")} />
        <ImageField label="Social sharing image" {...field("ogImageUrl")} />
        <TextField label="Google Analytics ID (G-XXXXXXX)" {...field("googleAnalyticsId")} />
        <TextField label="Search Console verification code" {...field("searchConsoleCode")} />
        <CheckField label="Allow search engines to index the site" {...field("allowIndexing")} />
      </Section>

      <Section title="Maintenance">
        <CheckField label="Put store under maintenance" {...field("maintenanceMode")} />
        <TextField label="Maintenance message" {...field("maintenanceMessage")} />
      </Section>

      <Section title="Returns">
        <TextField label="Return window (days)" type="number" {...field("returnWindowDays")} />
        <TextField label="Return policy text" rows={6} {...field("returnPolicy")} />
      </Section>

      <Section title="Shipping">
        <TextField label="Shipping charge in ₹ (0 = always free)" type="number" {...field("shippingFlatRate")} />
        <TextField label="Free shipping above ₹ (0 = never free)" type="number" {...field("freeShippingAbove")} />
        <TextField label="Couriers you use, one per line. For automatic tracking links add a bar and the courier's tracking link with {awb} in place of the number, like: Name | https://example.com/track?awb={awb}" rows={7} {...field("couriers")} />
      </Section>

      <Section title="Inventory">
        <TextField label="Low stock alert when stock is this number or less" type="number" {...field("lowStockThreshold")} />
      </Section>

      <Section title="Delivery area and Cash on Delivery">
        <TextField label="Deliverable pincodes (commas or spaces; empty = deliver everywhere)" rows={3} {...field("deliveryPincodes")} />
        <CheckField label="Enable Cash on Delivery" {...field("codEnabled")} />
        <TextField label="COD fee in ₹ (0 = free)" type="number" {...field("codFee")} />
        <TextField label="Maximum order value for COD in ₹ (0 = no limit)" type="number" {...field("codMaxOrder")} />
        <TextField label="COD pincodes (empty = all deliverable pincodes)" rows={3} {...field("codPincodes")} />
      </Section>

      <Section title="GST invoice and WhatsApp">
        <TextField label="GSTIN (15 characters; leave empty if not GST registered). Its first two digits are your state." {...field("gstin")} />
        <TextField label="Invoice number prefix (e.g. INV-)" {...field("invoicePrefix")} />
        <TextField label="GST % on shipping and COD fee" type="number" {...field("gstOnShipping")} />
        <TextField label="WhatsApp number with country code, digits only (e.g. 919876543210)" {...field("whatsappNumber")} />
      </Section>

      {msg && <p className="text-sm">{msg}</p>}
      <SubmitButton loading={loading}>Save settings</SubmitButton>
    </form>
  );
}
