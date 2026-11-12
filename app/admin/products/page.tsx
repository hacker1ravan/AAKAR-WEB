"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useAction } from "@/lib/hooks";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";
import { cld } from "@/lib/img";

const rs = (x: string) => Math.round(Number(x) * 100) || 0;

function QuickPrice({ p, onSaved }: { p: any; onSaved: () => void }) {
  const [price, setPrice] = useState(String(p.price / 100));
  const [mrp, setMrp] = useState(p.comparePrice ? String(p.comparePrice / 100) : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const changed = rs(price) !== p.price || (mrp ? rs(mrp) : 0) !== p.comparePrice;
  const box = "border p-1 rounded w-20 text-xs";

  return (
    <div className="space-y-1">
      <div className="flex gap-1 items-center">
        <input type="number" className={box} value={price} onChange={(e) => setPrice(e.target.value)} title="Selling price" aria-label="Selling price" />
        <input type="number" className={box} placeholder="MRP" value={mrp} onChange={(e) => setMrp(e.target.value)} title="MRP (optional)" aria-label="MRP" />
        {changed && (
          <button className="underline text-xs" disabled={busy}
            onClick={async () => {
              setBusy(true); setErr("");
              try {
                await api(`/api/products/${p.id}`, "PATCH", { price: rs(price), comparePrice: mrp ? rs(mrp) : 0 });
                onSaved();
              } catch (e: any) { setErr(e.message); }
              setBusy(false);
            }}>
            {busy ? "..." : "Save"}
          </button>
        )}
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

export default function AdminProducts() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const { run, msg } = useAction();

  const load = () => api("/api/admin/products").then(setRows);
  useEffect(() => {
    load();
    api("/api/admin/categories").then(setCats);
    const c = new URLSearchParams(window.location.search).get("category");
    if (c) setCat(c);
  }, []);

  const patch = (p: any, body: object, okMsg: string) =>
    run(async () => { await api(`/api/products/${p.id}`, "PATCH", body); await load(); }, okMsg);

  const shown = rows.filter(
    (p) =>
      (!q || p.name.toLowerCase().includes(q.toLowerCase())) &&
      (!cat || p.category === cat) &&
      (!hiddenOnly || !p.active)
  );

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Products ({shown.length})</h1>
        <Link href="/admin/products/new" className="bg-black text-white px-3 py-2 rounded text-sm">+ Add product</Link>
      </div>

      <div className="flex gap-2 flex-wrap text-sm">
        <input className="border p-2 rounded" placeholder="Search name" aria-label="Search name" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="border p-2 rounded" aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hiddenOnly} onChange={(e) => setHiddenOnly(e.target.checked)} /> Hidden only
        </label>
      </div>
      {msg && <p className="text-sm">{msg}</p>}

      <DataTable
        rows={shown}
        cols={[
          { header: "", render: (p) => <img src={cld(p.images[0], 96)} alt="" className="h-12 w-10 object-cover rounded" /> },
          { header: "Name", render: (p) => <span className={p.active ? "" : "opacity-50"}>{p.name}{!p.active && " (hidden)"}</span> },
          { header: "Category", render: (p) => p.category },
          { header: "Price / MRP in ₹ (edit and Save)", render: (p) => <QuickPrice key={p.id + p.price + p.comparePrice} p={p} onSaved={load} /> },
          { header: "Stock", render: (p) => p.variants.reduce((n: number, v: any) => n + v.stock, 0) },
          { header: "COD", render: (p) => (p.codAvailable ? "Yes" : "No") },
        ]}
        actions={(p) => (
          <>
            <Link href={`/admin/products/${p.id}`} className="underline">Edit</Link>
            <button className="underline" onClick={() => patch(p, { active: !p.active }, p.active ? "Hidden from store" : "Now visible")}>
              {p.active ? "Hide" : "Show"}
            </button>
            <button className="underline" onClick={() =>
              run(async () => {
                const r = await api(`/api/admin/products/${p.id}/duplicate`, "POST");
                router.push(`/admin/products/${r.id}`);
              }, "")}>Duplicate</button>
            <button className="underline" onClick={() => {
              if (confirm(`Delete "${p.name}"? Hiding it is safer.`))
                run(async () => { await api(`/api/products/${p.id}`, "DELETE"); await load(); }, "Deleted");
            }}>Delete</button>
          </>
        )}
      />
    </div>
  );
}
