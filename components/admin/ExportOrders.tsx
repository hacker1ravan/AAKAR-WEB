"use client";
import { useState } from "react";

const box = "border p-2 rounded";

export default function ExportOrders() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");

  const p = new URLSearchParams();
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  if (status) p.set("status", status);

  return (
    <div className="border rounded p-3 flex flex-wrap gap-2 items-end text-sm">
      <label>From<input type="date" className={`${box} block`} value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label>To<input type="date" className={`${box} block`} value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <label>Status
        <select className={`${box} block`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          {["pending", "paid", "processing", "shipped", "delivered", "cancelled"].map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      <a href={`/api/admin/orders/export?${p}`} className="bg-black text-white px-3 py-2 rounded">Download CSV</a>
    </div>
  );
}
