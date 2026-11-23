"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { useAction } from "@/lib/hooks";
import { DataTable } from "@/components/admin/DataTable";

const STATUSES = ["pending", "approved", "rejected"];

export default function AdminReviews() {
  const [data, setData] = useState<{ reviews: any[]; total: number; page: number; pages: number } | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  const { run, msg } = useAction();

  const load = (p = page, s = status) => {
    const params = new URLSearchParams({ page: String(p) });
    if (s) params.set("status", s);
    return api(`/api/admin/reviews?${params}`).then((d) => { setData(d); setPage(d.page); setErr(""); }).catch((e) => setErr(e.message));
  };
  useEffect(() => { load(1, ""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (id: string, s: string) =>
    run(async () => { await api(`/api/admin/reviews/${id}`, "PUT", { status: s }); await load(); }, `Marked ${s}`);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Reviews{data ? ` (${data.total})` : ""}</h1>
      <div className="flex gap-2 text-sm">
        <select className="input max-w-48" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); load(1, e.target.value); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      {msg && <p className="text-sm">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <DataTable
        rows={data?.reviews ?? []}
        cols={[
          { header: "Product", render: (r) => r.product.name },
          { header: "Customer", render: (r) => r.userName },
          { header: "Rating", render: (r) => "★".repeat(r.rating) },
          { header: "Review", render: (r) => r.comment },
          { header: "Status", render: (r) => r.status },
        ]}
        actions={(r) => (
          <>
            {r.status !== "approved" && <button className="btn btn-link btn-sm" onClick={() => set(r.id, "approved")}>Approve</button>}
            {r.status !== "rejected" && <button className="btn btn-link btn-sm" onClick={() => set(r.id, "rejected")}>Reject</button>}
            <button className="btn btn-danger btn-sm" onClick={() => {
              if (confirm("Delete this review?"))
                run(async () => { await api(`/api/admin/reviews/${r.id}`, "DELETE"); await load(); }, "Deleted");
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
