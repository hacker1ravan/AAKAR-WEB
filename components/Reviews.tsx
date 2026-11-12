import Link from "next/link";
import ReviewForm from "./ReviewForm";
import { fmtDate } from "@/lib/format";

type R = { id: string; userName: string; rating: number; comment: string; createdAt: Date };
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function Reviews({
  productId, reviews, canReview, loggedIn, mine,
}: {
  productId: string; reviews: R[]; canReview: boolean; loggedIn: boolean;
  mine: { rating: number; comment: string; status: string } | null;
}) {
  const avg = reviews.length ? reviews.reduce((n, r) => n + r.rating, 0) / reviews.length : 0;
  return (
    <section className="max-w-5xl mx-auto p-4 space-y-3">
      <h2 className="text-xl font-semibold">
        Reviews {reviews.length > 0 && <span className="text-base font-normal">· ★ {avg.toFixed(1)} ({reviews.length})</span>}
      </h2>
      {reviews.map((r) => (
        <div key={r.id} className="border rounded p-3 text-sm">
          <p className="text-amber-500">{stars(r.rating)}</p>
          <p className="whitespace-pre-line">{r.comment}</p>
          <p className="text-xs mt-1">{r.userName} · {fmtDate(r.createdAt)}</p>
        </div>
      ))}
      {!reviews.length && <p className="text-sm">No reviews yet.</p>}
      {canReview && <ReviewForm productId={productId} mine={mine} />}
      {!loggedIn && <p className="text-sm"><Link href="/login" className="underline">Log in</Link> to review products you bought.</p>}
    </section>
  );
}
