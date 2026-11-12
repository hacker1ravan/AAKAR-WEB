"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { Section, TextField, SubmitButton } from "@/components/ui/fields";

type Status = { enabled: boolean; recoveryLeft: number; required: boolean };

function Codes({ codes }: { codes: string[] }) {
  return (
    <div className="border rounded p-3 space-y-2 text-sm">
      <p className="font-medium">Your backup codes</p>
      <p>Keep these somewhere safe, like a password manager. Each one works once if you lose your phone. They will not be shown again.</p>
      <ul className="grid grid-cols-2 gap-1 font-mono">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
      <button type="button" className="underline" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}>Copy all</button>
    </div>
  );
}

export default function Security() {
  const router = useRouter();
  const [st, setSt] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const { values: v, setValues, field } = useForm({ code: "", password: "", disableCode: "", renewCode: "" });
  const { run, loading, msg } = useAction();
  const load = () => api("/api/admin/security").then(setSt);
  useEffect(() => { load(); }, []);
  // lets the sign-in cookie pick up the new two-factor state
  const refreshSession = () => fetch("/api/auth/session").then(() => router.refresh());

  if (!st) return <p className="p-6">Loading...</p>;
  return (
    <div className="p-4 space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Security</h1>
      {st.required && !st.enabled && (
        <p className="border border-red-600 text-red-700 rounded p-3 text-sm">
          This store requires two-factor login for admins. Set it up below to use the rest of the admin panel.
        </p>
      )}

      {!st.enabled && (
        <Section title="Two-factor login (off)">
          <p className="text-sm">
            With two-factor login, a password alone is not enough to get into the admin panel: you also type a 6-digit code
            from an authenticator app (Google Authenticator, Authy, 1Password and others).
          </p>
          {!setup ? (
            <button className="bg-black text-white rounded px-4 py-2 text-sm"
              onClick={() => run(async () => setSetup(await api("/api/admin/security/setup", "POST")), "")}>
              Set up two-factor login
            </button>
          ) : (
            <form className="space-y-3" onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const r = await api("/api/admin/security/enable", "POST", { code: v.code });
                setCodes(r.recoveryCodes); setSetup(null); setValues((p) => ({ ...p, code: "" }));
                await load(); await refreshSession();
              }, "");
            }}>
              <p className="text-sm">1. Scan this with your authenticator app, or type the key in by hand.</p>
              <img src={setup.qr} alt="QR code for your authenticator app" className="border" width={220} height={220} />
              <p className="text-sm font-mono break-all">{setup.secret}</p>
              <TextField label="2. Type the 6-digit code the app shows" required {...field("code")} />
              <SubmitButton loading={loading}>Turn on</SubmitButton>
            </form>
          )}
        </Section>
      )}

      {codes && <Codes codes={codes} />}

      {st.enabled && (
        <>
          <Section title="Two-factor login (on)">
            <p className="text-sm">You need a code from your app to log in. Backup codes left: {st.recoveryLeft}.</p>
          </Section>
          <form onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await api("/api/admin/security/recovery", "POST", { code: v.renewCode }); setCodes(r.recoveryCodes); setValues((p) => ({ ...p, renewCode: "" })); await load(); }, ""); }}>
            <Section title="Make new backup codes">
              <TextField label="Current 6-digit code" required {...field("renewCode")} />
              <SubmitButton loading={loading}>Make new codes</SubmitButton>
            </Section>
          </form>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!confirm("Turn off two-factor login? You will be logged out.")) return;
            run(async () => { await api("/api/admin/security/disable", "POST", { password: v.password, code: v.disableCode }); window.location.href = "/login"; }, "");
          }}>
            <Section title="Turn off two-factor login">
              <TextField label="Your password" type="password" required {...field("password")} />
              <TextField label="Current code or a backup code" required {...field("disableCode")} />
              <SubmitButton loading={loading}>Turn off</SubmitButton>
            </Section>
          </form>
        </>
      )}
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </div>
  );
}
