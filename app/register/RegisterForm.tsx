"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { FormMessage } from "@/components/ui/fields";

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
        <div className="w-full max-w-sm space-y-4 surface p-6">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-sm">
            We sent a confirmation link to <b>{form.email}</b>. Open it to finish creating your account, then log in.
            Look in your spam folder if you do not see it.
          </p>
          <FormMessage msg={note} />
          <button type="button" className="btn btn-link btn-sm" onClick={resend}>Send the email again</button>
          <p className="text-sm"><Link href="/login" className="underline">Go to login</Link></p>
        </div>
      </main>
    );

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 surface p-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Create account</h1>
        <FormMessage msg={error} status="error" />
        <label className="block text-sm font-medium text-[var(--ink)]">
          Name
          <input className="input mt-1" autoComplete="name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-[var(--ink)]">
          Email
          <input className="input mt-1" type="email" autoComplete="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label className="block text-sm font-medium text-[var(--ink)]">
          Password <span className="font-normal text-[var(--muted)]">(min 8 characters)</span>
          <input className="input mt-1" type="password" autoComplete="new-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8} required />
        </label>
        <button disabled={loading} className="btn btn-dark btn-block">
          {loading ? "Creating..." : "Register"}
        </button>
        <p className="text-sm">Have an account? <Link href="/login" className="underline">Login</Link></p>
      </form>
    </main>
  );
}
