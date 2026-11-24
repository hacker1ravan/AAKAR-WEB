"use client";
import Link from "next/link";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { FormMessage, TextField, SubmitButton } from "@/components/ui/fields";

export default function ForgotPassword() {
  const { values, field } = useForm({ email: "" });
  const { run, loading, msg, status } = useAction();

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form
        className="w-full max-w-sm space-y-4 border p-6 rounded-lg"
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => api("/api/auth/forgot-password", "POST", values),
            "If that email is registered, we have sent a reset link. Check your inbox and spam folder."
          );
        }}
      >
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Forgot password</h1>
        <p className="text-sm">Enter your email and we will send you a link to reset your password.</p>
        <TextField label="Email" type="email" required {...field("email")} />
        <FormMessage msg={msg} status={status} />
        <SubmitButton loading={loading}>Send reset link</SubmitButton>
        <p className="text-sm"><Link href="/login" className="underline">Back to login</Link></p>
      </form>
    </main>
  );
}
