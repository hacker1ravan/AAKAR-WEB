"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useAction } from "@/lib/hooks";
import { DataTable } from "@/components/admin/DataTable";

export default function AdminReviews() {
  const [rows, setRows] = useState<any[]>([]);
  const { run, msg } = useAction();
  const load = () =>
    api("/api/admin/reviews").then((r: any[]) =>
      setRows([...r].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending")))
    );
  useEffect(() => { load(); }, []);

  const set = (id: string, status: string) =>
    run(async () => { await api(`/api/admin/reviews/${id}`, "PUT", { status }); await load(); }, `Marked ${status}`);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Reviews</h1>
      {msg && <p className="text-sm">{msg}</p>}
      <DataTable
        rows={rows}
        cols={[
          { header: "Product", render: (r) => r.product.name },
          { header: "Customer", render: (r) => r.userName },
          { header: "Rating", render: (r) => "★".repeat(r.rating) },
          { header: "Review", render: (r) => r.comment },
          { header: "Status", render: (r) => r.status },
        ]}
        actions={(r) => (
          <>
            {r.status !== "approved" && <button className="underline" onClick={() => set(r.id, "approved")}>Approve</button>}
            {r.status !== "rejected" && <button className="underline" onClick={() => set(r.id, "rejected")}>Reject</button>}
            <button className="underline" onClick={() => {
              if (confirm("Delete this review?"))
                run(async () => { await api(`/api/admin/reviews/${r.id}`, "DELETE"); await load(); }, "Deleted");
            }}>Delete</button>
          </>
        )}
      />
    </div>
  );
}
