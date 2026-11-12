"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useForm, useAction } from "@/lib/hooks";
import { TextField, SubmitButton } from "@/components/ui/fields";

export default function ReviewForm({
  productId, mine,
}: { productId: string; mine: { rating: number; comment: string; status: string } | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(mine?.rating ?? 5);
  const { values, field } = useForm({ comment: mine?.comment ?? "" });
  const { run, loading, msg } = useAction();

  return (
    <form
      className="border rounded p-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          await api("/api/reviews", "POST", { productId, rating, comment: values.comment });
          router.refresh();
        }, "Thanks! Your review will appear after approval.");
      }}
    >
      <h3 className="font-semibold">{mine ? "Edit your review" : "Write a review"}</h3>
      {mine && <p className="text-xs">Current status: {mine.status}. Editing sends it for approval again.</p>}
      <label className="block text-sm">Rating
        <select className="w-full border p-2 rounded mt-1" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
        </select>
      </label>
      <TextField label="Your review" rows={3} required {...field("comment")} />
      {msg && <p className="text-sm">{msg}</p>}
      <SubmitButton loading={loading}>Submit review</SubmitButton>
    </form>
  );
}
