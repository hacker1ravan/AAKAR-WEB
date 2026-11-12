"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";
import { cld } from "@/lib/img";

function Restock({ v, t, onSaved }: { v: any; t: number; onSaved: () => void }) {
  const [val, setVal] = useState(String(v.stock));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const changed = (Math.max(0, Math.floor(Number(val))) || 0) !== v.stock;
  const tone =
    v.stock === 0 ? "border-red-500 bg-red-50" : v.stock <= t ? "border-amber-500 bg-amber-50" : "";

  return (
    <div className={`flex items-center gap-2 border rounded p-1 text-xs ${tone}`}>
      <span className="w-28 truncate">{v.color} · {v.size}</span>
      <input type="number" min={0} className="w-16 border p-1 rounded" aria-label="Stock" value={val}
        onChange={(e) => setVal(e.target.value)} />
      {v.stock === 0 && <b className="text-red-600">Out</b>}
      {changed && (
        <button className="underline" disabled={busy}
          onClick={async () => {
            setBusy(true); setErr("");
            try {
              await api(`/api/admin/variants/${v.id}`, "PUT", { stock: Math.max(0, Math.floor(Number(val))) || 0 });
              onSaved();
            } catch (e: any) { setErr(e.message); }
            setBusy(false);
          }}>
          {busy ? "..." : "Save"}
        </button>
      )}
      {err && <span className="text-red-600">{err}</span>}
    </div>
  );
}

export default function LowStock() {
  const [data, setData] = useState<{ threshold: number; products: any[] } | null>(null);
  const [cat, setCat] = useState("");
  const [onlyOut, setOnlyOut] = useState(false);
  const load = () => api("/api/admin/low-stock").then(setData);
  useEffect(() => { load(); }, []);

  if (!data) return <p className="p-6">Loading...</p>;
  const { threshold: t, products } = data;

  const byCat = new Map<string, { products: number; out: number }>();
  for (const p of products) {
    const c = byCat.get(p.category) ?? { products: 0, out: 0 };
    c.products++;
    if (p.outCount) c.out++;
    byCat.set(p.category, c);
  }
  const shown = products.filter((p) => (!cat || p.category === cat) && (!onlyOut || p.outCount > 0));
  const pill = (on: boolean) => `border rounded-full px-3 py-1 text-sm whitespace-nowrap ${on ? "bg-black text-white" : ""}`;

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Low stock</h1>
        <p className="text-sm">
          Showing products with a size or colour at {t} or less.{" "}
          <Link href="/admin/settings" className="underline">Change this number</Link>
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button className={pill(!cat)} onClick={() => setCat("")}>All ({products.length})</button>
        {[...byCat].map(([name, c]) => (
          <button key={name} className={pill(cat === name)} onClick={() => setCat(name)}>
            {name} ({c.products}){c.out > 0 && <span className="text-red-500"> · {c.out} out</span>}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyOut} onChange={(e) => setOnlyOut(e.target.checked)} />
        Show only products that are out of stock in some size
      </label>

      <DataTable
        rows={shown}
        cols={[
          { header: "", render: (p) => p.image && <img src={cld(p.image, 96)} alt="" className="h-14 w-11 object-cover rounded" /> },
          {
            header: "Product",
            render: (p) => (
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs">{p.category} · {inr(p.price)}</p>
                <p className="text-xs">
                  Total left: <b>{p.totalStock}</b>
                  {p.outCount > 0 && <span className="text-red-600"> · {p.outCount} out</span>}
                  {p.lowCount > 0 && <span className="text-amber-600"> · {p.lowCount} low</span>}
                </p>
              </div>
            ),
          },
          {
            header: "Stock by size and colour (edit and save to restock)",
            render: (p) => (
              <div className="grid gap-1">
                {p.variants.map((v: any) => <Restock key={v.id} v={v} t={t} onSaved={load} />)}
              </div>
            ),
          },
        ]}
        actions={(p) => <Link href={`/admin/products/${p.id}`} className="underline">Edit product</Link>}
      />
      {!shown.length && <p className="text-center text-sm">Nothing is low on stock. 🎉</p>}
    </div>
  );
}
