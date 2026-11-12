"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useAction } from "@/lib/hooks";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";

export default function AdminReturns() {
  const [rows, setRows] = useState<any[]>([]);
  const { run, msg } = useAction();
  const load = () => api("/api/admin/returns").then(setRows);
  useEffect(() => { load(); }, []);

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

  const btn = "underline mr-2";
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Returns</h1>
      {msg && <p className="text-sm">{msg}</p>}
      <DataTable
        rows={rows}
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
    </div>
  );
}
