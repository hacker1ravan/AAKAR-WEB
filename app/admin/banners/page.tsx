"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { DataTable } from "@/components/admin/DataTable";
import { Section, TextField, CheckField, ImageField, SubmitButton } from "@/components/ui/fields";
import { cld } from "@/lib/img";

const empty = {
  imageUrl: "", title: "", subtitle: "", buttonText: "", linkUrl: "",
  position: "0", active: true, startsAt: "", endsAt: "",
};
const ist = (d: string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default function AdminBanners() {
  const [rows, setRows] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const { values: v, setValues, field } = useForm(empty);
  const { run, loading, msg } = useAction();
  const load = () => api("/api/admin/banners").then(setRows);
  useEffect(() => { load(); }, []);
  const reset = () => { setEditId(null); setValues(empty); };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (!v.imageUrl) throw new Error("Please upload a banner image");
      const body = {
        imageUrl: v.imageUrl,
        title: v.title.trim(),
        subtitle: v.subtitle.trim(),
        buttonText: v.buttonText.trim(),
        linkUrl: v.linkUrl.trim(),
        position: Math.max(0, Math.round(Number(v.position)) || 0),
        active: v.active,
        startsAt: v.startsAt || null,
        endsAt: v.endsAt || null,
      };
      if (editId) await api(`/api/admin/banners/${editId}`, "PUT", body);
      else await api("/api/admin/banners", "POST", body);
      reset();
      await load();
    }, editId ? "Updated!" : "Banner added!");
  };

  const status = (b: any) => {
    const now = Date.now();
    if (!b.active) return "Off";
    if (b.endsAt && new Date(b.endsAt).getTime() < now) return "Ended";
    if (b.startsAt && new Date(b.startsAt).getTime() > now) return "Scheduled";
    return "Live";
  };

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Home page banners</h1>
      <form onSubmit={submit} className="space-y-3">
        <Section title={editId ? "Edit banner" : "Add banner"}>
          <ImageField label="Banner image (wide, about 1600 x 600, keep the important part in the centre)" {...field("imageUrl")} />
          <TextField label="Title (optional)" {...field("title")} />
          <TextField label="Subtitle (optional)" {...field("subtitle")} />
          <TextField label="Button text (optional, e.g. Shop now)" {...field("buttonText")} />
          <TextField label="Link (e.g. /products?sale=1 or /products?category=Jewellery)" {...field("linkUrl")} />
          <TextField label="Display order (0 shows first)" type="number" {...field("position")} />
          <TextField label="Show from date (optional)" type="date" {...field("startsAt")} />
          <TextField label="Show until date (optional)" type="date" {...field("endsAt")} />
          <CheckField label="Active" {...field("active")} />
        </Section>
        {msg && <p className="text-sm">{msg}</p>}
        <SubmitButton loading={loading}>{editId ? "Save changes" : "Add banner"}</SubmitButton>
        {editId && <button type="button" className="underline text-sm" onClick={reset}>Cancel edit</button>}
      </form>

      <DataTable
        rows={rows}
        cols={[
          { header: "", render: (b) => <img src={cld(b.imageUrl, 200)} alt="" className="h-12 w-24 object-cover rounded" /> },
          { header: "Title", render: (b) => b.title || "-" },
          { header: "Link", render: (b) => b.linkUrl || "-" },
          { header: "Order", render: (b) => b.position },
          { header: "Status", render: status },
        ]}
        actions={(b) => (
          <>
            <button className="underline" onClick={() => {
              setEditId(b.id);
              setValues({
                imageUrl: b.imageUrl, title: b.title, subtitle: b.subtitle, buttonText: b.buttonText,
                linkUrl: b.linkUrl, position: String(b.position), active: b.active,
                startsAt: b.startsAt ? ist(b.startsAt) : "", endsAt: b.endsAt ? ist(b.endsAt) : "",
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}>Edit</button>
            <button className="underline" onClick={() => {
              if (confirm("Delete this banner?"))
                run(async () => { await api(`/api/admin/banners/${b.id}`, "DELETE"); await load(); }, "Deleted");
            }}>Delete</button>
          </>
        )}
      />
    </div>
  );
}
