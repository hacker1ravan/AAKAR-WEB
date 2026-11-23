"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useAction } from "@/lib/hooks";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";

const STATUSES = ["requested", "approved", "rejected", "received", "refunded"];

export default function AdminReturns() {
  const [data, setData] = useState<{ returns: any[]; total: number; page: number; pages: number } | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  const { run, msg } = useAction();

  const load = (p = page, s = status) => {
    const params = new URLSearchParams({ page: String(p) });
    if (s) params.set("status", s);
    return api(`/api/admin/returns?${params}`).then((d) => { setData(d); setPage(d.page); setErr(""); }).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(1, ""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (r: any, status: string) => {
    let adminNote = "";
    if (status === "rejected") adminNote = prompt("Reason for rejection?") ?? "";
    if (status === "refunded") {
      const msgText = r.order.paymentMethod === "cod"
        ? `Cash on Delivery order: this only records the refund. Send ${inr(r.order.total)} to the customer yourself. Continue?`
        : `Refund ${inr(r.order.total)} to the customer via Razorpay?`;
      if (!confirm(msgText)) return;
    }
    run(async () => {
      await api(`/api/admin/returns/${r.id}`, "PUT", { status, adminNote });
      await load();
    }, `Marked ${status}`);
  };

  const btn = "btn btn-link btn-sm";
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Returns{data ? ` (${data.total})` : ""}</h1>
      <div className="flex gap-2 text-sm">
        <select className="input max-w-48" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); load(1, e.target.value); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <DataTable
        rows={data?.returns ?? []}
        cols={[
          { header: "Order", render: (r) => "#" + r.order.id.slice(-8).toUpperCase() },
          { header: "Customer", render: (r) => r.order.user.name || r.order.user.email },
          { header: "Reason", render: (r) => r.reason + (r.details ? ` - ${r.details}` : "") },
          { header: "Status", render: (r) => r.status },
        ]}
        actions={(r) => (
          <>
            {r.status === "requested" && (
              <>
                <button className={btn} onClick={() => act(r, "approved")}>Approve</button>
                <button className={btn} onClick={() => act(r, "rejected")}>Reject</button>
              </>
            )}
            {r.status === "approved" && <button className={btn} onClick={() => act(r, "received")}>Mark received</button>}
            {r.status === "received" && <button className={btn} onClick={() => act(r, "refunded")}>Refund</button>}
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
