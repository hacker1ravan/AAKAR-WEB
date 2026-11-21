"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";
import { fmtDate } from "@/lib/format";

const d = (x: string | null) => (x ? fmtDate(x) : "-");

export default function Customers() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("new");
  useEffect(() => { api("/api/admin/customers").then(setRows); }, []);
  if (!rows) return <p className="p-6">Loading...</p>;

  const term = q.toLowerCase();
  const shown = rows
    .filter((c) => !term || `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(term))
    .sort((a, b) => (sort === "spent" ? b.spent - a.spent : sort === "orders" ? b.orders - a.orders : 0));

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center gap-2">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Customers ({shown.length})</h1>
        <a href="/api/admin/customers/export" className="btn btn-outline btn-sm">Download CSV</a>
      </div>
      <div className="flex gap-2 text-sm">
        <input className="input flex-1" placeholder="Search name, email or phone" aria-label="Search customers" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="new">Newest</option>
          <option value="spent">Top spenders</option>
          <option value="orders">Most orders</option>
        </select>
      </div>
      <DataTable
        rows={shown}
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
    </div>
  );
}
