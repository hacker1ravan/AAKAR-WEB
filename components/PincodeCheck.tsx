"use client";
import { useState } from "react";
import { api } from "@/lib/fetcher";

export default function PincodeCheck() {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function check() {
    setBusy(true);
    try {
      const r = await api(`/api/pincode?pin=${pin}`);
      setMsg(r.deliverable
        ? `Delivery available${r.codAllowed ? " · Cash on Delivery available" : ""}`
        : "Sorry, we do not deliver here yet");
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div className="space-y-1 text-sm">
      <div className="flex gap-2">
        <input inputMode="numeric" maxLength={6} placeholder="Pincode" aria-label="Pincode" className="border p-2 rounded w-36"
          value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <button type="button" disabled={busy || pin.length !== 6} className="border px-3 rounded disabled:opacity-40" onClick={check}>
          Check delivery
        </button>
      </div>
      {msg && <p>{msg}</p>}
    </div>
  );
}
