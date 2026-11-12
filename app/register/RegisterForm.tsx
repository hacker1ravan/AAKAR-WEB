"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";

export default function RegisterForm({ initialEmail }: { initialEmail: string }) {
  const [form, setForm] = useState({ name: "", email: initialEmail, password: "" });
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/register", "POST", form);
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setLoading(false);
  }

  async function resend() {
    try {
      await api("/api/auth/resend-verification", "POST", { email: form.email });
      setNote("Sent again. It can take a minute to arrive.");
    } catch (err: any) {
      setNote(err.message);
    }
  }

  if (sent)
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 border p-6 rounded-lg">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-sm">
            We sent a confirmation link to <b>{form.email}</b>. Open it to finish creating your account, then log in.
            Look in your spam folder if you do not see it.
          </p>
          {note && <p className="text-sm">{note}</p>}
          <button type="button" className="underline text-sm" onClick={resend}>Send the email again</button>
          <p className="text-sm"><Link href="/login" className="underline">Go to login</Link></p>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 border p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Create account</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input className="w-full border p-2 rounded" placeholder="Name" aria-label="Name"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="w-full border p-2 rounded" type="email" placeholder="Email" aria-label="Email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="w-full border p-2 rounded" type="password" placeholder="Password (min 8 chars)" aria-label="Password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={8} required />
        <button disabled={loading} className="w-full bg-black text-white p-2 rounded disabled:opacity-50">
          {loading ? "Creating..." : "Register"}
        </button>
        <p className="text-sm">Have an account? <Link href="/login" className="underline">Login</Link></p>
      </form>
    </main>
  );
}
