"use client";
import { signOut } from "next-auth/react";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { Section, TextField } from "@/components/ui/fields";

export default function PrivacyForm() {
  const { values, field } = useForm({ password: "", confirm: "" });
  const { run, loading, msg } = useAction();

  return (
    <Section title="Your data">
      <p className="text-sm">
        Download a copy of everything we hold about you: your details, addresses, orders, reviews and wishlist.
      </p>
      <a href="/api/account/export" className="inline-block border rounded px-4 py-2 text-sm">Download my data</a>

      <form
        className="space-y-3 border-t pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!confirm("Delete your account? This cannot be undone.")) return;
          run(async () => {
            await api("/api/account/delete", "POST", values);
            await signOut({ callbackUrl: "/" });
          }, "");
        }}
      >
        <h3 className="font-medium text-sm">Delete my account</h3>
        <p className="text-xs">
          This removes your name, email, addresses, wishlist and reviews. We keep the order records (amounts, items,
          invoice numbers) without your name, phone and address, because shops must keep sales and tax records.
          You cannot delete the account while an order or return is still in progress.
        </p>
        <TextField label="Your password" type="password" required {...field("password")} />
        <TextField label="Type DELETE to confirm" required {...field("confirm")} />
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <button disabled={loading || values.confirm !== "DELETE"} className="border border-red-600 text-red-600 rounded px-4 py-2 text-sm disabled:opacity-40">
          {loading ? "Please wait..." : "Delete my account"}
        </button>
      </form>
    </Section>
  );
}
