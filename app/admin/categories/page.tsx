"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { DataTable } from "@/components/admin/DataTable";
import { Section, TextField, CheckField, ImageField, SubmitButton } from "@/components/ui/fields";
import { cld } from "@/lib/img";

const empty = { name: "", imageUrl: "", position: "0", active: true, codAvailable: true, sizeChart: "" };

export default function AdminCategories() {
  const [rows, setRows] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const { values: v, setValues, field } = useForm(empty);
  const { run, loading, msg } = useAction();
  const load = () => api("/api/admin/categories").then(setRows);
  useEffect(() => { load(); }, []);

  const reset = () => { setEditId(null); setValues(empty); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name: v.name.trim(),
      imageUrl: v.imageUrl,
      position: Math.max(0, Math.round(Number(v.position)) || 0),
      active: v.active,
      codAvailable: v.codAvailable,
      sizeChart: v.sizeChart,
    };
    run(async () => {
      if (editId) await api(`/api/admin/categories/${editId}`, "PUT", body);
      else await api("/api/admin/categories", "POST", body);
      reset();
      await load();
    }, editId ? "Updated!" : "Category added!");
  };

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Categories</h1>

      <form onSubmit={submit} className="space-y-3">
        <Section title={editId ? "Edit category" : "Add category"}>
          <TextField label="Name (e.g. Clothes, Jewellery)" required {...field("name")} />
          <ImageField label="Category image (shown on home page)" {...field("imageUrl")} />
          <TextField label="Display order (0 shows first)" type="number" {...field("position")} />
          <CheckField label="Show on website menu and home page" {...field("active")} />
          <CheckField label="Cash on Delivery available for products in this category" {...field("codAvailable")} />
          <TextField label="Size chart (one row per line, columns separated by |)" rows={6} {...field("sizeChart")} />
          <p className="text-xs">Example: first line "Size | Chest (in) | Waist (in)", next line "M | 38 | 32"</p>
        </Section>
        {msg && <p className="text-sm">{msg}</p>}
        <SubmitButton loading={loading}>{editId ? "Save changes" : "Add category"}</SubmitButton>
        {editId && <button type="button" className="underline text-sm" onClick={reset}>Cancel edit</button>}
      </form>

      <DataTable
        rows={rows}
        cols={[
          { header: "", render: (c) => c.imageUrl ? <img src={cld(c.imageUrl, 96)} alt="" className="h-10 w-10 object-cover rounded" /> : null },
          { header: "Name", render: (c) => c.name },
          { header: "Products", render: (c) => <Link href={`/admin/products?category=${encodeURIComponent(c.name)}`} className="underline">{c.products}</Link> },
          { header: "Order", render: (c) => c.position },
          { header: "Visible", render: (c) => (c.active ? "Yes" : "Hidden") },
          { header: "COD", render: (c) => (c.codAvailable ? "Yes" : "No") },
        ]}
        actions={(c) => (
          <>
            <button className="underline" onClick={() => {
              setEditId(c.id);
              setValues({
                name: c.name, imageUrl: c.imageUrl, position: String(c.position),
                active: c.active, codAvailable: c.codAvailable, sizeChart: c.sizeChart,
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}>Edit</button>
            <button className="underline" onClick={() => {
              if (!confirm(`Delete "${c.name}"?`)) return;
              run(async () => {
                try {
                  await api(`/api/admin/categories/${c.id}`, "DELETE");
                } catch (e: any) {
                  if (!c.products) throw e;
                  const others = rows.filter((r) => r.id !== c.id).map((r) => r.name);
                  const to = prompt(`${c.products} product(s) are in "${c.name}". Move them to which category?\n${others.join(", ")}`);
                  if (!to) throw new Error("Delete cancelled");
                  await api(`/api/admin/categories/${c.id}?moveTo=${encodeURIComponent(to.trim())}`, "DELETE");
                }
                await load();
              }, "Deleted");
            }}>Delete</button>
          </>
        )}
      />
    </div>
  );
}
