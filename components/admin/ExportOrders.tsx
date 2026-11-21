"use client";
import { useState } from "react";

const box = "input";

export default function ExportOrders() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");

  const p = new URLSearchParams();
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  if (status) p.set("status", status);

  return (
    <div className="surface p-3 flex flex-wrap gap-2 items-end text-sm">
      <label className="text-[var(--ink-soft)]">From<input type="date" className={`${box} block mt-1`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label className="text-[var(--ink-soft)]">To<input type="date" className={`${box} block mt-1`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <label className="text-[var(--ink-soft)]">Status
        <select className={`${box} block mt-1`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {["pending", "paid", "processing", "shipped", "delivered", "cancelled"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <a href={`/api/admin/orders/export?${p}`} className="btn btn-dark">Download CSV</a>
    </div>
  );
}
