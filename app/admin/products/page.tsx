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
  const box = "input w-20 text-xs";

  return (
    <div className="space-y-1">
      <div className="flex gap-1 items-center">
        <input type="number" className={box} value={price} onChange={(e) => setPrice(e.target.value)} title="Selling price" aria-label="Selling price" />
        <input type="number" className={box} placeholder="MRP" value={mrp} onChange={(e) => setMrp(e.target.value)} title="MRP (optional)" aria-label="MRP" />
        {changed && (
          <button className="btn btn-dark btn-sm" disabled={busy}
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
  const [data, setData] = useState<{ products: any[]; total: number; page: number; pages: number } | null>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  const { run, msg } = useAction();

  const load = (p = page, f = { q, cat, hiddenOnly }) => {
    const params = new URLSearchParams({ page: String(p) });
    if (f.q.trim()) params.set("q", f.q.trim());
    if (f.cat) params.set("category", f.cat);
    if (f.hiddenOnly) params.set("hidden", "1");
    return api(`/api/admin/products?${params}`).then((d) => { setData(d); setPage(d.page); setErr(""); }).catch((e) => setErr(e.message));
  };
  useEffect(() => {
    api("/api/admin/categories").then(setCats);
    const c = new URLSearchParams(window.location.search).get("category") ?? "";
    if (c) setCat(c);
    load(1, { q: "", cat: c, hiddenOnly: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (p: any, body: object, okMsg: string) =>
    run(async () => { await api(`/api/products/${p.id}`, "PATCH", body); await load(); }, okMsg);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Products{data ? ` (${data.total})` : ""}</h1>
        <Link href="/admin/products/new" className="btn btn-dark btn-sm">+ Add product</Link>
      </div>

      <form className="flex gap-2 flex-wrap text-sm" onSubmit={(e) => { e.preventDefault(); load(1); }}>
        <input className="input max-w-48" placeholder="Search name" aria-label="Search name" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input max-w-48" aria-label="Category" value={cat}
          onChange={(e) => { setCat(e.target.value); load(1, { q, cat: e.target.value, hiddenOnly }); }}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hiddenOnly}
            onChange={(e) => { setHiddenOnly(e.target.checked); load(1, { q, cat, hiddenOnly: e.target.checked }); }} /> Hidden only
        </label>
        <button className="btn btn-dark btn-sm">Search</button>
      </form>
      {msg && <p className="text-sm">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      <DataTable
        rows={data?.products ?? []}
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
            <Link href={`/admin/products/${p.id}`} className="btn btn-link btn-sm">Edit</Link>
            <button className="btn btn-link btn-sm" onClick={() => patch(p, { active: !p.active }, p.active ? "Hidden from store" : "Now visible")}>
              {p.active ? "Hide" : "Show"}
            </button>
            <button className="btn btn-link btn-sm" onClick={() =>
              run(async () => {
                const r = await api(`/api/admin/products/${p.id}/duplicate`, "POST");
                router.push(`/admin/products/${r.id}`);
              }, "")}>Duplicate</button>
            <button className="btn btn-danger btn-sm" onClick={() => {
              if (confirm(`Delete "${p.name}"? Hiding it is safer.`))
                run(async () => { await api(`/api/products/${p.id}`, "DELETE"); await load(); }, "Deleted");
            }}>Delete</button>
          </>
        )}
      />

      {data && data.pages > 1 && (
        <div className="flex items-center gap-4 text-sm">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
          <span className="text-[var(--ink-soft)]">Page {data.page} of {data.pages}</span>
          <button className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => load(page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
