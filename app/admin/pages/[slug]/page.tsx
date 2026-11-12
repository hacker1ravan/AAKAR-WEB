"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { TextField, SubmitButton } from "@/components/ui/fields";

export default function EditPage() {
  const { slug } = useParams<{ slug: string }>();
  const { values: v, setValues, field } = useForm({ title: "", content: "" });
  const [loaded, setLoaded] = useState(false);
  const { run, loading, msg } = useAction();

  useEffect(() => {
    api(`/api/admin/pages/${slug}`).then((d) => {
      setValues({ title: d.title, content: d.content });
      setLoaded(true);
    });
  }, [slug, setValues]);

  if (!loaded) return <p className="p-6">Loading...</p>;
  return (
    <form
      className="max-w-2xl mx-auto p-4 space-y-4"
      onSubmit={(e) => { e.preventDefault(); run(() => api(`/api/admin/pages/${slug}`, "PUT", v)); }}
    >
      <h1 className="text-2xl font-bold">Edit page</h1>
      <TextField label="Title" required {...field("title")} />
      <TextField label="Content" rows={20} {...field("content")} />
      {msg && <p className="text-sm">{msg}</p>}
      <SubmitButton loading={loading}>Save page</SubmitButton>
      <Link href={`/${slug}`} className="underline text-sm" target="_blank">View page</Link>
    </form>
  );
}
