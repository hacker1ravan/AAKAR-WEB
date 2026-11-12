"use client";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { Section, TextField, SubmitButton } from "@/components/ui/fields";

export default function ProfileForm({ name }: { name: string }) {
  const { values, field } = useForm({ name });
  const { run, loading, msg } = useAction();
  return (
    <form onSubmit={(e) => { e.preventDefault(); run(() => api("/api/account/profile", "PUT", values), "Name saved"); }}>
      <Section title="Your details">
        <TextField label="Name" required {...field("name")} />
        {msg && <p className="text-sm">{msg}</p>}
        <SubmitButton loading={loading}>Save name</SubmitButton>
      </Section>
    </form>
  );
}
