"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { TextField, SubmitButton } from "@/components/ui/fields";

export default function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const { values, field } = useForm({ password: "", confirm: "" });
  const { run, loading, msg } = useAction();

  if (!token)
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <p>This reset link is not valid.</p>
        <Link href="/forgot-password" className="underline">Request a new link</Link>
      </main>
    );

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form
        className="w-full max-w-sm space-y-4 border p-6 rounded-lg"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (values.password !== values.confirm) throw new Error("Passwords do not match");
            await api("/api/auth/reset-password", "POST", { token, password: values.password });
            router.push("/login");
          }, "Password changed!");
        }}
      >
        <h1 className="text-2xl font-bold">Set new password</h1>
        <TextField label="New password (min 8 characters)" type="password" required {...field("password")} />
        <TextField label="Confirm password" type="password" required {...field("confirm")} />
        {msg && <p className="text-sm">{msg}</p>}
        <SubmitButton loading={loading}>Change password</SubmitButton>
      </form>
    </main>
  );
}
