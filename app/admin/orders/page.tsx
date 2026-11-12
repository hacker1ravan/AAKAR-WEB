"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";
import ExportOrders from "@/components/admin/ExportOrders";
import { TextField, CheckField, SubmitButton } from "@/components/ui/fields";
import { fmtDate } from "@/lib/format";

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];
const box = "border p-2 rounded text-sm";

export default function AdminOrders() {
  const [data, setData] = useState<{ orders: any[]; total: number; page: number; pages: number; couriers: string[] } | null>(null);
  const [sel, setSel] = useState<any>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");

  const load = (p = page, f = { q, status, method }) => {
    const params = new URLSearchParams({ page: String(p) });
    if (f.q.trim()) params.set("q", f.q.trim());
    if (f.status) params.set("status", f.status);
    if (f.method) params.set("method", f.method);
    return api(`/api/admin/orders?${params}`).then((d) => { setData(d); setPage(d.page); setErr(""); }).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Orders{data ? ` (${data.total})` : ""}</h1>
      <ExportOrders />

      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); load(1); }}>
        <input className={`${box} flex-1 min-w-48`} placeholder="Search order no., name, phone, email or tracking no." aria-label="Search orders"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={box} aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); load(1, { q, status: e.target.value, method }); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className={box} aria-label="Payment" value={method} onChange={(e) => { setMethod(e.target.value); load(1, { q, status, method: e.target.value }); }}>
          <option value="">Online and COD</option>
          <option value="online">Online</option>
          <option value="cod">COD</option>
        </select>
        <button className="bg-black text-white px-4 rounded text-sm">Search</button>
      </form>
      {err && <p className="text-sm text-red-600">{err}</p>}

      <DataTable
        rows={data?.orders ?? []}
        cols={[
          { header: "Order", render: (o) => "#" + o.id.slice(-8).toUpperCase() },
          { header: "Customer", render: (o) => (o.shippingName || o.user.name || o.user.email) + (o.user.role === "guest" ? " (guest)" : "") },
          { header: "Total", render: (o) => inr(o.total) },
          { header: "Payment", render: (o) => (o.paymentMethod === "cod" ? "COD" : "Online") },
          { header: "Status", render: (o) => o.status },
          { header: "Date", render: (o) => fmtDate(o.createdAt) },
        ]}
        actions={(o) => (
          <>
            <button className="underline" onClick={() => setSel(o)}>Manage</button>
            {!["pending", "cancelled"].includes(o.status) && (
              <a className="underline" href={`/admin/orders/${o.id}/label`} target="_blank" rel="noreferrer">Label</a>
            )}
          </>
        )}
      />

      {data && data.pages > 1 && (
        <div className="flex items-center gap-4 text-sm">
          <button className="border rounded px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
          <span>Page {data.page} of {data.pages}</span>
          <button className="border rounded px-3 py-1 disabled:opacity-40" disabled={page >= data.pages} onClick={() => load(page + 1)}>Next</button>
        </div>
      )}

      {sel && (
        <OrderPanel key={sel.id} order={sel} couriers={data?.couriers ?? []} onDone={() => { setSel(null); load(); }} />
      )}
    </div>
  );
}

function OrderPanel({ order, couriers, onDone }: { order: any; couriers: string[]; onDone: () => void }) {
  const { values: v, setValues, field } = useForm({
    status: order.status as string,
    note: "",
    courier: order.courier as string,
    trackingNumber: order.trackingNumber as string,
    trackingUrl: order.trackingUrl as string,
    notify: true,
  });
  const { run, loading, msg } = useAction();
  const st = field("status");
  const [custom, setCustom] = useState(!!order.courier && !couriers.includes(order.courier));

  return (
    <form
      className="border rounded-lg p-4 space-y-3 max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => { await api(`/api/admin/orders/${order.id}`, "PUT", v); onDone(); }, "Updated!");
      }}
    >
      <h2 className="font-semibold">Order #{order.id.slice(-8).toUpperCase()}</h2>
      <div className="text-sm">
        <p>{order.shippingName} · {order.shippingPhone}</p>
        <p>{order.shippingAddress}</p>
        <p className="font-medium">
          {order.paymentMethod === "cod" ? `Cash on Delivery: collect ${inr(order.total)}` : "Paid online"} · PIN {order.shippingPincode}
        </p>
        <p>{order.items.length} item(s) · {order.user.email}{order.user.role === "guest" ? " (guest checkout)" : ""}</p>
        {!["pending", "cancelled"].includes(order.status) && (
          <p className="space-x-3">
            <a href={`/invoice/${order.id}`} target="_blank" rel="noreferrer" className="underline">View invoice</a>
            <a href={`/admin/orders/${order.id}/label`} target="_blank" rel="noreferrer" className="underline">Print label</a>
          </p>
        )}
      </div>
      <label className="block text-sm">Status
        <select className="w-full border p-2 rounded mt-1" value={st.value}
          onChange={(e) => st.onChange(e.target.value)}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </label>
      {v.status === "shipped" && (
        <>
          <label className="block text-sm">Courier
            <select className="w-full border p-2 rounded mt-1" value={custom ? "__other" : v.courier}
              onChange={(e) => {
                if (e.target.value === "__other") { setCustom(true); setValues((p) => ({ ...p, courier: "" })); }
                else { setCustom(false); setValues((p) => ({ ...p, courier: e.target.value })); }
              }}>
              <option value="">Select courier</option>
              {couriers.map((c) => <option key={c}>{c}</option>)}
              <option value="__other">Other...</option>
            </select>
          </label>
          {custom && <TextField label="Courier name" {...field("courier")} />}
          <TextField label="Tracking number" required {...field("trackingNumber")} />
          <TextField label="Tracking link (optional: made automatically if the courier has a link in Settings)" {...field("trackingUrl")} />
        </>
      )}
      <TextField label="Note to customer (optional)" {...field("note")} />
      <CheckField label="Email the customer" {...field("notify")} />
      {msg && <p className="text-sm">{msg}</p>}
      <SubmitButton loading={loading}>Update order</SubmitButton>
      <button type="button" className="underline text-sm" onClick={onDone}>Close</button>
    </form>
  );
}
