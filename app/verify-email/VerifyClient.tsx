"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/fetcher";

export default function VerifyClient({ token }: { token: string }) {
  const [state, setState] = useState<"working" | "done" | "error">(token ? "working" : "error");
  const [msg, setMsg] = useState(token ? "" : "This link is not valid.");

  useEffect(() => {
    if (!token) return;
    api("/api/auth/verify-email", "POST", { token })
      .then(() => setState("done"))
      .catch((e) => { setMsg(e.message); setState("error"); });
  }, [token]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 border p-6 rounded-lg text-center">
        {state === "working" && <p>Confirming your email...</p>}
        {state === "done" && (
          <>
            <h1 className="text-2xl font-bold">Email confirmed</h1>
            <p className="text-sm">Your account is ready. You can log in now.</p>
            <Link href="/login?verified=1" className="block bg-black text-white p-2 rounded">Log in</Link>
          </>
        )}
        {state === "error" && (
          <>
            <h1 className="text-2xl font-bold">Could not confirm</h1>
            <p className="text-sm">{msg}</p>
            <Link href="/login" className="underline text-sm">Go to login</Link>
          </>
        )}
      </div>
    </main>
  );
}
