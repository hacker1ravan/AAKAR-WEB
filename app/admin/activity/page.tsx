"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/fetcher";
import { fmtDateTime } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";

export default function Activity() {
  const [data, setData] = useState<{ rows: any[]; total: number; page: number; pages: number } | null>(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");

  const load = (page = 1, term = q) =>
    api(`/api/admin/activity?page=${page}&q=${encodeURIComponent(term)}`).then((d) => { setData(d); setErr(""); }).catch((e) => setErr(e.message));
  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 space-y-4">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Activity{data ? ` (${data.total})` : ""}</h1>
      <p className="text-sm">Who changed what in the admin panel, plus admin sign-ins and privacy requests. Kept for one year.</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); load(1); }}>
        <input className="input text-sm flex-1" placeholder="Search person, action or details" aria-label="Search activity"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-dark btn-sm">Search</button>
      </form>
      {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
      <DataTable
        rows={data?.rows ?? []}
        cols={[
          { header: "When", render: (r) => fmtDateTime(r.createdAt) },
          { header: "Who", render: (r) => r.userEmail || (r.userId ? "(removed customer)" : "-") },
          { header: "What", render: (r) => r.action },
          { header: "Details", render: (r) => <span className="text-xs break-all">{r.details}</span> },
          { header: "From", render: (r) => r.ip || "-" },
        ]}
      />
      {data && data.pages > 1 && (
        <div className="flex items-center gap-4 text-sm">
          <button className="btn btn-outline btn-sm" disabled={data.page <= 1} onClick={() => load(data.page - 1)}>Previous</button>
          <span>Page {data.page} of {data.pages}</span>
          <button className="btn btn-outline btn-sm" disabled={data.page >= data.pages} onClick={() => load(data.page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
