"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/fetcher";

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
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 border p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Login</h1>
        {info && <p className="text-green-700 text-sm">{info}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {notVerified && (
          <button type="button" className="underline text-sm" onClick={resend}>Send the confirmation email again</button>
        )}
        <input className="w-full border p-2 rounded" type="email" placeholder="Email" aria-label="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} readOnly={needCode} required />
        <input className="w-full border p-2 rounded" type="password" placeholder="Password" aria-label="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} readOnly={needCode} required />
        {needCode && (
          <input className="w-full border p-2 rounded tracking-widest" inputMode="text" autoComplete="one-time-code" autoFocus
            placeholder="123456 or backup code" aria-label="Two-factor code"
            value={code} onChange={(e) => setCode(e.target.value)} required />
        )}
        <p className="text-sm"><Link href="/forgot-password" className="underline">Forgot password?</Link></p>
        <button disabled={loading} className="w-full bg-black text-white p-2 rounded disabled:opacity-50">
          {loading ? "Signing in..." : needCode ? "Verify and log in" : "Login"}
        </button>
        <p className="text-sm">No account? <Link href="/register" className="underline">Register</Link></p>
      </form>
    </main>
  );
}
