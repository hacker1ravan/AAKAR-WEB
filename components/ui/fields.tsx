"use client";
import { useState } from "react";
import { cld } from "@/lib/img";

type F<V> = { label: string; value: V; onChange: (v: V) => void };
const input = "input mt-1";
// Shared label + helper-text styling so every field reads as one system.
// `--ink-soft` (not `--muted`) keeps hint text above the 4.5:1 contrast floor.
const labelText = "block text-sm font-medium text-[var(--ink)]";
const hintText = "mt-1 text-xs text-[var(--ink-soft)]";
const reqMark = <span className="text-[var(--danger)]"> *</span>;

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="surface p-4 space-y-3">
    <h2 className="font-semibold">{title}</h2>
    {children}
  </section>
);

export const TextField = ({
  label, value, onChange, required, type = "text", rows,
}: F<string> & { required?: boolean; type?: string; rows?: number }) => (
  <label className={labelText}>
    {label}{required && reqMark}
    {rows ? (
      <textarea className={input} rows={rows} value={value} required={required}
        onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className={input} type={type} value={value} required={required}
        onChange={(e) => onChange(e.target.value)} />
    )}
  </label>
);

export const CheckField = ({ label, value, onChange }: F<boolean>) => (
  <label className="flex items-center gap-2.5 py-1 text-sm font-medium text-[var(--ink)] cursor-pointer select-none">
    <input type="checkbox" className="h-4 w-4" checked={value} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

export const ColorField = ({ label, value, onChange, hint }: F<string> & { hint?: string }) => (
  <label className={labelText}>
    {label}
    <span className="mt-1 flex items-center gap-2.5">
      <input type="color"
        className="h-9 w-12 shrink-0 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--line-strong)] bg-[var(--surface)] p-0.5"
        value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="font-mono text-xs uppercase tracking-wide text-[var(--ink-soft)]">{value}</span>
    </span>
    {hint && <p className={hintText}>{hint}</p>}
  </label>
);

async function upload(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Upload failed");
  return d.url;
}

export const ImageField = ({ label, value, onChange, hint }: F<string> & { hint?: string }) => {
  const [busy, setBusy] = useState(false);
  return (
    <div className="text-sm">
      <span className={labelText}>{label}</span>
      {hint && <p className={hintText}>{hint}</p>}
      {value && (
        <div className="flex items-center gap-3 my-2">
          <img src={cld(value, 200)} alt="" className="h-14 max-w-40 object-contain border border-[var(--line)] bg-[var(--surface-2)] rounded-[var(--radius-sm)] p-1" />
          <button type="button" className="btn btn-link btn-sm" onClick={() => onChange("")}>Remove</button>
        </div>
      )}
      <input type="file" accept="image/*" className="block mt-1" disabled={busy}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try { onChange(await upload(f)); } catch (er: any) { alert(er.message); }
          setBusy(false);
          e.target.value = "";
        }} />
      {busy && <p className="mt-1 text-xs text-[var(--ink-soft)]">Uploading…</p>}
    </div>
  );
};

export const ImagesField = ({ label, value, onChange }: F<string[]>) => (
  <div className="text-sm">
    <span className={labelText}>{label}</span>
    <div className="flex gap-2 flex-wrap my-2">
      {value.map((u) => (
        <div key={u} className="relative">
          <img src={cld(u, 200)} alt="" className="h-20 border border-[var(--line)] rounded-[var(--radius-sm)]" />
          <button type="button" aria-label="Remove image" className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-[var(--ink)] text-white text-xs shadow-[var(--shadow-sm)]"
            onClick={() => onChange(value.filter((x) => x !== u))}>×</button>
        </div>
      ))}
    </div>
    <input type="file" accept="image/*" multiple
      onChange={async (e) => {
        const files = Array.from(e.target.files ?? []);
        const urls = await Promise.all(files.map((f) => upload(f))).catch((er) => (alert(er.message), [] as string[]));
        onChange([...value, ...urls]);
      }} />
  </div>
);

/**
 * Shared status/feedback line for forms. Renders nothing when empty; otherwise
 * announces to assistive tech (role=alert on error, role=status on success/info)
 * and colours itself from semantic tokens so success and error are distinguishable.
 */
export const FormMessage = ({
  msg, status = "",
}: { msg: string; status?: "" | "ok" | "error" }) => {
  if (!msg) return null;
  const err = status === "error";
  return (
    <p
      role={err ? "alert" : "status"}
      aria-live={err ? "assertive" : "polite"}
      className={"text-sm" + (err ? " text-[var(--danger)]" : status === "ok" ? " text-[var(--ok)]" : "")}
    >
      {msg}
    </p>
  );
};

export const SubmitButton = ({ loading, children }: { loading: boolean; children: React.ReactNode }) => (
  <button disabled={loading} className="btn btn-dark btn-block">
    {loading ? "Please wait..." : children}
  </button>
);
