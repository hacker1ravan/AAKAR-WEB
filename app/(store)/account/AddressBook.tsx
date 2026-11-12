"use client";
import { useState } from "react";
import { api } from "@/lib/fetcher";
import { stateName } from "@/lib/gst";
import { useForm, useAction } from "@/lib/hooks";
import StateSelect from "@/components/StateSelect";
import { Section, TextField, CheckField, SubmitButton } from "@/components/ui/fields";

type Addr = { id: string; label: string; name: string; phone: string; pincode: string; state: string; address: string; isDefault: boolean };
const empty = { label: "", name: "", phone: "", pincode: "", state: "", address: "", isDefault: false };

export default function AddressBook({ initial }: { initial: Addr[] }) {
  const [rows, setRows] = useState<Addr[]>(initial);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(initial.length === 0);
  const { values: v, setValues, field } = useForm(empty);
  const { run, loading, msg } = useAction();
  const reload = () => api("/api/account/addresses").then(setRows);

  const close = () => { setOpen(false); setEditId(null); setValues(empty); };

  return (
    <Section title="Saved addresses">
      {rows.map((a) => (
        <div key={a.id} className="border rounded p-3 text-sm space-y-1">
          <p className="font-medium">
            {a.label || a.name}{a.isDefault && <span className="ml-2 text-xs border rounded px-1">Default</span>}
          </p>
          <p>{a.name} · {a.phone}</p>
          <p className="whitespace-pre-line">{a.address}</p>
          <p>{stateName(a.state)} · PIN {a.pincode}</p>
          <div className="flex gap-3 pt-1">
            <button className="underline" onClick={() => {
              setEditId(a.id); setOpen(true);
              setValues({ label: a.label, name: a.name, phone: a.phone, pincode: a.pincode, state: a.state, address: a.address, isDefault: a.isDefault });
            }}>Edit</button>
            {!a.isDefault && (
              <button className="underline" onClick={() =>
                run(async () => { await api(`/api/account/addresses/${a.id}`, "PUT", { ...a, isDefault: true }); await reload(); }, "Default address changed")}>
                Make default
              </button>
            )}
            <button className="underline" onClick={() => {
              if (confirm("Delete this address?"))
                run(async () => { await api(`/api/account/addresses/${a.id}`, "DELETE"); await reload(); }, "Address deleted");
            }}>Delete</button>
          </div>
        </div>
      ))}
      {!rows.length && !open && <p className="text-sm">No saved addresses yet.</p>}

      {open ? (
        <form
          className="space-y-3 border rounded p-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              if (editId) await api(`/api/account/addresses/${editId}`, "PUT", v);
              else await api("/api/account/addresses", "POST", v);
              await reload();
              close();
            }, "Address saved");
          }}
        >
          <TextField label="Label (Home, Office...)" {...field("label")} />
          <TextField label="Full name" required {...field("name")} />
          <TextField label="Mobile number (10 digits)" type="tel" required {...field("phone")} />
          <TextField label="Pincode (6 digits)" type="tel" required {...field("pincode")} />
          <StateSelect value={v.state} onChange={(s) => setValues((p) => ({ ...p, state: s }))} />
          <TextField label="Full address" rows={3} required {...field("address")} />
          <CheckField label="Use as my default address" {...field("isDefault")} />
          <SubmitButton loading={loading}>{editId ? "Save changes" : "Save address"}</SubmitButton>
          <button type="button" className="underline text-sm" onClick={close}>Cancel</button>
        </form>
      ) : (
        <button className="underline text-sm" onClick={() => setOpen(true)}>+ Add an address</button>
      )}
      {msg && <p className="text-sm">{msg}</p>}
    </Section>
  );
}
