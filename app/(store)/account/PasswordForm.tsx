"use client";
import { signOut } from "next-auth/react";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { Section, TextField, SubmitButton } from "@/components/ui/fields";

export default function PasswordForm() {
  const { values, setValues, field } = useForm({ currentPassword: "", newPassword: "", confirm: "" });
  const { run, loading, msg } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          if (values.newPassword !== values.confirm) throw new Error("The new passwords do not match");
          await api("/api/account/password", "PUT", { currentPassword: values.currentPassword, newPassword: values.newPassword });
          setValues({ currentPassword: "", newPassword: "", confirm: "" });
          // every session ends when the password changes, so log in again with the new one
          await signOut({ callbackUrl: "/login" });
        }, "Password changed. Please log in again.");
      }}
    >
      <Section title="Change password">
        <TextField label="Current password" type="password" required {...field("currentPassword")} />
        <TextField label="New password (min 8 characters)" type="password" required {...field("newPassword")} />
        <TextField label="Confirm new password" type="password" required {...field("confirm")} />
        {msg && <p className="text-sm">{msg}</p>}
        <SubmitButton loading={loading}>Change password</SubmitButton>
      </Section>
    </form>
  );
}
