"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";
import { Section, TextField, CheckField, SubmitButton } from "@/components/ui/fields";
import { fmtDate } from "@/lib/format";

const empty = {
  code: "", type: "percent", value: "", minOrder: "0", maxDiscount: "0",
  usageLimit: "0", perUserLimit: "1", expiresAt: "", active: true,
};
const rs = (x: string) => Math.round(Number(x) * 100) || 0;

export default function AdminCoupons() {
  const [rows, setRows] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const { values: v, setValues, field } = useForm(empty);
  const { run, loading, msg } = useAction();
  const load = () => api("/api/admin/coupons").then(setRows);
  useEffect(() => { load(); }, []);
  const reset = () => { setEditId(null); setValues(empty); };
  const pct = v.type === "percent";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      code: v.code.trim(),
      type: v.type,
      value: pct ? Math.round(Number(v.value)) : rs(v.value),
      minOrder: rs(v.minOrder),
      maxDiscount: pct ? rs(v.maxDiscount) : 0,
      usageLimit: Math.round(Number(v.usageLimit)) || 0,
      perUserLimit: Math.round(Number(v.perUserLimit)) || 0,
      expiresAt: v.expiresAt || null,
      active: v.active,
    };
    run(async () => {
      if (editId) await api(`/api/admin/coupons/${editId}`, "PUT", body);
      else await api("/api/admin/coupons", "POST", body);
      reset();
      await load();
    }, editId ? "Updated!" : "Coupon created!");
  };

  const status = (c: any) =>
    !c.active ? "Off" : c.expiresAt && new Date(c.expiresAt) < new Date() ? "Expired" : "Active";

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">Coupons</h1>
      <form onSubmit={submit} className="space-y-3">
        <Section title={editId ? "Edit coupon" : "Create coupon"}>
          <TextField label="Code (e.g. WELCOME10)" required {...field("code")} />
          <label className="block text-sm">Type
            <select className="w-full border p-2 rounded mt-1" value={v.type}
              onChange={(e) => setValues((p) => ({ ...p, type: e.target.value }))}>
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
          </label>
          <TextField label={pct ? "Discount % (1-100)" : "Discount amount in ₹"} type="number" required {...field("value")} />
          <TextField label="Minimum order in ₹ (0 = none)" type="number" {...field("minOrder")} />
          {pct && <TextField label="Maximum discount in ₹ (0 = no cap)" type="number" {...field("maxDiscount")} />}
          <TextField label="Total uses allowed (0 = unlimited)" type="number" {...field("usageLimit")} />
          <TextField label="Uses per customer (0 = unlimited)" type="number" {...field("perUserLimit")} />
          <TextField label="Expiry date (leave empty = never)" type="date" {...field("expiresAt")} />
          <CheckField label="Active" {...field("active")} />
        </Section>
        {msg && <p className="text-sm">{msg}</p>}
        <SubmitButton loading={loading}>{editId ? "Save changes" : "Create coupon"}</SubmitButton>
        {editId && <button type="button" className="underline text-sm" onClick={reset}>Cancel edit</button>}
      </form>

      <DataTable
        rows={rows}
        cols={[
          { header: "Code", render: (c) => c.code },
          { header: "Discount", render: (c) => (c.type === "percent" ? `${c.value}%` : inr(c.value)) },
          { header: "Min order", render: (c) => (c.minOrder ? inr(c.minOrder) : "-") },
          { header: "Used", render: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ""}` },
          { header: "Expires", render: (c) => (c.expiresAt ? fmtDate(c.expiresAt) : "Never") },
          { header: "Status", render: status },
        ]}
        actions={(c) => (
          <>
            <button className="underline" onClick={() => {
              setEditId(c.id);
              setValues({
                code: c.code, type: c.type,
                value: String(c.type === "percent" ? c.value : c.value / 100),
                minOrder: String(c.minOrder / 100), maxDiscount: String(c.maxDiscount / 100),
                usageLimit: String(c.usageLimit), perUserLimit: String(c.perUserLimit),
                expiresAt: c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "",
                active: c.active,
              });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}>Edit</button>
            <button className="underline" onClick={() => {
              if (confirm(`Delete coupon ${c.code}?`))
                run(async () => { await api(`/api/admin/coupons/${c.id}`, "DELETE"); await load(); }, "Deleted");
            }}>Delete</button>
          </>
        )}
      />
    </div>
  );
}
