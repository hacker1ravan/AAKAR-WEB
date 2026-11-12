"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { Section, TextField, CheckField, ImagesField, SubmitButton } from "@/components/ui/fields";

type Variant = { id?: string; size: string; color: string; stock: number | string };
const cell = "border p-2 rounded";

export default function ProductForm({ product }: { product?: any }) {
  const router = useRouter();
  const { values: v, setValues, field } = useForm({
    name: (product?.name ?? "") as string,
    description: (product?.description ?? "") as string,
    price: (product ? String(product.price / 100) : "") as string,
    comparePrice: (product?.comparePrice ? String(product.comparePrice / 100) : "") as string,
    gstRate: (product ? String(product.gstRate) : "5") as string,
    hsnCode: (product?.hsnCode ?? "") as string,
    category: (product?.category ?? "") as string,
    codAvailable: (product?.codAvailable ?? true) as boolean,
    active: (product?.active ?? true) as boolean,
    images: (product?.images ?? []) as string[],
    variants: (product?.variants?.map(({ id, size, color, stock }: Variant) => ({ id, size, color, stock })) ??
      [{ size: "M", color: "", stock: 0 }]) as Variant[],
  });
  const { run, loading, msg } = useAction();
  const [cats, setCats] = useState<any[]>([]);
  useEffect(() => { api("/api/admin/categories").then(setCats).catch(() => {}); }, []);

  const setVar = (i: number, k: keyof Variant, val: string) =>
    setValues((p) => ({ ...p, variants: p.variants.map((x, j) => (j === i ? { ...x, [k]: val } : x)) }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      const price = Math.round(Number(v.price) * 100);
      if (!(price > 0)) throw new Error("Enter a valid price");
      const comparePrice = v.comparePrice ? Math.round(Number(v.comparePrice) * 100) : 0;
      if (comparePrice && comparePrice <= price) throw new Error("MRP must be higher than the selling price");
      const body = {
        name: v.name,
        description: v.description,
        price,
        comparePrice,
        gstRate: Number(v.gstRate) || 0,
        hsnCode: v.hsnCode.trim(),
        category: v.category.trim(),
        codAvailable: v.codAvailable,
        active: v.active,
        images: v.images,
        variants: v.variants.map(({ id, size, color, stock }) => ({
          ...(id ? { id } : {}),
          size: size.trim(),
          color: color.trim(),
          stock: Number(stock) || 0,
        })),
      };
      if (product) await api(`/api/products/${product.id}`, "PUT", body);
      else await api("/api/products", "POST", body);
      router.push("/admin/products");
      router.refresh();
    }, "Saved!");
  }

  return (
    <form onSubmit={submit} className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">{product ? "Edit product" : "Add product"}</h1>
      <Section title="Details">
        <TextField label="Name" required {...field("name")} />
        <TextField label="Description" rows={4} required {...field("description")} />
        <TextField label="Selling price in ₹ (e.g. 999)" required {...field("price")} />
        <TextField label="Original price / MRP in ₹ (optional, e.g. 1499, shows the discount)" {...field("comparePrice")} />
        <TextField label="GST % included in the price (confirm the rate with your accountant)" type="number" {...field("gstRate")} />
        <TextField label="HSN code (4 to 8 digits, optional: it appears on GST invoices; ask your accountant for the right code)" {...field("hsnCode")} />
        <label className="block text-sm">Category *
          <select required className="w-full border p-2 rounded mt-1" value={v.category}
            onChange={(e) => setValues((p) => ({ ...p, category: e.target.value }))}>
            <option value="">Select category</option>
            {v.category && !cats.some((c) => c.name === v.category) && <option>{v.category}</option>}
            {cats.map((c) => <option key={c.id}>{c.name}</option>)}
          </select>
        </label>
        <CheckField label="Cash on Delivery available for this product" {...field("codAvailable")} />
        <CheckField label="Visible in store (untick to hide this product)" {...field("active")} />
      </Section>
      <Section title="Images (first one is the main image)">
        <ImagesField label="Upload" {...field("images")} />
      </Section>
      <Section title="Sizes, colours and stock">
        {v.variants.map((x, i) => (
          <div key={i} className="flex gap-2">
            <input className={`${cell} w-20`} placeholder="Size" aria-label="Size" value={x.size} onChange={(e) => setVar(i, "size", e.target.value)} />
            <input className={`${cell} flex-1 min-w-0`} placeholder="Colour" aria-label="Colour" value={x.color} onChange={(e) => setVar(i, "color", e.target.value)} />
            <input className={`${cell} w-20`} type="number" min={0} placeholder="Stock" aria-label="Stock" value={x.stock} onChange={(e) => setVar(i, "stock", e.target.value)} />
            <button type="button" className="px-2" aria-label="Remove variant"
              onClick={() => setValues((p) => ({ ...p, variants: p.variants.filter((_, j) => j !== i) }))}>x</button>
          </div>
        ))}
        <button type="button" className="underline text-sm"
          onClick={() => setValues((p) => ({ ...p, variants: [...p.variants, { size: "", color: "", stock: 0 }] }))}>
          + Add variant
        </button>
      </Section>
      {msg && <p className="text-sm">{msg}</p>}
      <SubmitButton loading={loading}>Save product</SubmitButton>
    </form>
  );
}
