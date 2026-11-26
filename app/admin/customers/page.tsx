"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";
import { fmtDate } from "@/lib/format";

const d = (x: string | null) => (x ? fmtDate(x) : "-");

export default function Customers() {
  const [data, setData] = useState<{ customers: any[]; total: number; page: number; pages: number } | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");

  const load = (p = page, f = { q, sort }) => {
    const params = new URLSearchParams({ page: String(p) });
    if (f.q.trim()) params.set("q", f.q.trim());
    if (f.sort !== "new") params.set("sort", f.sort);
    return api(`/api/admin/customers?${params}`).then((dd) => { setData(dd); setPage(dd.page); setErr(""); }).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(1, { q: "", sort: "new" }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Customers{data ? ` (${data.total})` : ""}</h1>
        <a href="/api/admin/customers/export" className="btn btn-outline btn-sm">Download CSV</a>
      </div>
      <form className="flex gap-2 text-sm" onSubmit={(e) => { e.preventDefault(); load(1); }}>
        <input className="input flex-1" placeholder="Search name, email or phone" aria-label="Search customers" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); load(1, { q, sort: e.target.value }); }}>
          <option value="new">Newest</option>
          <option value="spent">Top spenders</option>
          <option value="orders">Most orders</option>
        </select>
        <button className="btn btn-dark btn-sm">Search</button>
      </form>
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
      <DataTable
        rows={data?.customers ?? []}
        cols={[
          { header: "Name", render: (c) => c.name || "-" },
          { header: "Email", render: (c) => c.email },
          { header: "Phone", render: (c) => c.phone || "-" },
          { header: "Orders", render: (c) => c.orders },
          { header: "Spent", render: (c) => inr(c.spent) },
          { header: "Last order", render: (c) => d(c.lastOrder) },
          { header: "Joined", render: (c) => d(c.joined) },
        ]}
        actions={(c) => <Link href={`/admin/customers/${c.id}`} className="btn btn-link btn-sm">View</Link>}
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
