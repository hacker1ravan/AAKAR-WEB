"use client";
import { useState } from "react";
import { cld } from "@/lib/img";

type F<V> = { label: string; value: V; onChange: (v: V) => void };
const input = "w-full border p-2 rounded mt-1";

export const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="border rounded-lg p-4 space-y-3">
    <h2 className="font-semibold">{title}</h2>
    {children}
  </section>
);

export const TextField = ({
  label, value, onChange, required, type = "text", rows,
}: F<string> & { required?: boolean; type?: string; rows?: number }) => (
  <label className="block text-sm">
    {label}{required && " *"}
    {rows ? (
      <textarea className={input} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className={input} type={type} value={value} required={required}
        onChange={(e) => onChange(e.target.value)} />
    )}
  </label>
);

export const CheckField = ({ label, value, onChange }: F<boolean>) => (
  <label className="flex items-center gap-2 text-sm">
    <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

export const ColorField = ({ label, value, onChange }: F<string>) => (
  <label className="block text-sm">
    {label}
    <input type="color" className="block w-full h-10 mt-1" value={value}
      onChange={(e) => onChange(e.target.value)} />
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
      {label}
      {hint && <p className="text-xs">{hint}</p>}
      {value && (
        <div className="flex items-center gap-3 my-2">
          <img src={cld(value, 200)} alt="" className="h-14 max-w-40 object-contain border bg-gray-50 p-1" />
          <button type="button" className="underline text-xs" onClick={() => onChange("")}>Remove</button>
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
      {busy && <p className="text-xs">Uploading...</p>}
    </div>
  );
};

export const ImagesField = ({ label, value, onChange }: F<string[]>) => (
  <div className="text-sm">
    {label}
    <div className="flex gap-2 flex-wrap my-2">
      {value.map((u) => (
        <div key={u} className="relative">
          <img src={cld(u, 200)} alt="" className="h-20 border" />
          <button type="button" aria-label="Remove image" className="absolute top-0 right-0 bg-black text-white px-1"
            onClick={() => onChange(value.filter((x) => x !== u))}>x</button>
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

export const SubmitButton = ({ loading, children }: { loading: boolean; children: React.ReactNode }) => (
  <button disabled={loading} className="w-full bg-black text-white p-2 rounded disabled:opacity-50">
    {loading ? "Please wait..." : children}
  </button>
);
