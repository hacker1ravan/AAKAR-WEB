"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { FormMessage } from "@/components/ui/fields";

export default function LoginForm({ next, verified }: { next: string; verified: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needCode, setNeedCode] = useState(false);
  const [error, setError] = useState("");
  const [notVerified, setNotVerified] = useState(false);
  const [info, setInfo] = useState(verified ? "Your email is confirmed. You can log in now." : "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    setNotVerified(false);
    const res = await signIn("credentials", { email, password, code: needCode ? code : "", redirect: false });
    setLoading(false);
    if (res?.error === "EMAIL_NOT_VERIFIED") {
      setNotVerified(true);
      return setError("Please confirm your email first. We sent you a link when you registered.");
    }
    if (res?.error === "TWO_FACTOR_REQUIRED") {
      setNeedCode(true);
      return setInfo("Enter the 6-digit code from your authenticator app. If you lost your phone, use a backup code.");
    }
    if (res?.error === "TWO_FACTOR_INVALID") return setError("That code is not correct. Try the newest code, or a backup code.");
    if (res?.error)
      return setError(res.error === "CredentialsSignin" ? "Invalid email or password" : res.error);
    router.push(next);
    router.refresh();
  }

  async function resend() {
    try {
      await api("/api/auth/resend-verification", "POST", { email });
      setInfo("If this email needs confirming, we have sent a new link. Check your inbox and spam folder.");
      setError("");
      setNotVerified(false);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 surface p-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Login</h1>
        <FormMessage msg={info} status="ok" />
        <FormMessage msg={error} status="error" />
        {notVerified && (
          <button type="button" className="btn btn-link btn-sm" onClick={resend}>Send the confirmation email again</button>
        )}
        <label className="block text-sm font-medium text-[var(--ink)]">
          Email
          <input className="input mt-1" type="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} readOnly={needCode} required />
        </label>
        <label className="block text-sm font-medium text-[var(--ink)]">
          Password
          <input className="input mt-1" type="password" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} readOnly={needCode} required />
        </label>
        {needCode && (
          <label className="block text-sm font-medium text-[var(--ink)]">
            Two-factor code
            <input className="input mt-1 tracking-widest" inputMode="text" autoComplete="one-time-code" autoFocus
              placeholder="123456 or backup code"
              value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
        )}
        <p className="text-sm"><Link href="/forgot-password" className="underline">Forgot password?</Link></p>
        <button disabled={loading} className="btn btn-dark btn-block">
          {loading ? "Signing in..." : needCode ? "Verify and log in" : "Login"}
        </button>
        <p className="text-sm">No account? <Link href="/register" className="underline">Register</Link></p>
      </form>
    </main>
  );
}
