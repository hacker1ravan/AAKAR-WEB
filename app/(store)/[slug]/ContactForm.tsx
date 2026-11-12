"use client";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { TextField, SubmitButton } from "@/components/ui/fields";

export default function ContactForm() {
  const { values: v, setValues, field } = useForm({ name: "", email: "", message: "", website: "" });
  const { run, loading, msg } = useAction();

  return (
    <form
      className="border rounded p-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          await api("/api/contact", "POST", v);
          setValues({ name: "", email: "", message: "", website: "" });
        }, "Thank you! We will reply soon.");
      }}
    >
      <h2 className="font-semibold">Send us a message</h2>
      <TextField label="Name" required {...field("name")} />
      <TextField label="Email" type="email" required {...field("email")} />
      <TextField label="Message" rows={4} required {...field("message")} />
      {/* hidden spam trap: real users never fill this */}
      <input className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" value={v.website}
        onChange={(e) => setValues((p) => ({ ...p, website: e.target.value }))} />
      {msg && <p className="text-sm">{msg}</p>}
      <SubmitButton loading={loading}>Send</SubmitButton>
    </form>
  );
}
