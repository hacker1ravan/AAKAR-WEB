"use client";
import { STATES } from "@/lib/gst";

export default function StateSelect({
  value, onChange, required = true, label = "State",
}: { value: string; onChange: (v: string) => void; required?: boolean; label?: string }) {
  return (
    <label className="block text-sm">
      {label}{required && " *"}
      <select className="w-full border p-2 rounded mt-1" value={value} required={required} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select state</option>
        {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>
    </label>
  );
}
