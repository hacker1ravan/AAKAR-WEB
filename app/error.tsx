"use client";
import Link from "next/link";

// Shown when a page fails unexpectedly. The error itself is logged (and emailed to you) on the server.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="max-w-xl mx-auto p-8 text-center space-y-4">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p>We could not load this page. Please try again. If it keeps happening, contact us.</p>
      {error.digest && <p className="text-xs">Reference: {error.digest}</p>}
      <div className="flex gap-3 justify-center">
        <button onClick={reset} className="bg-[var(--primary)] text-[var(--secondary)] rounded px-5 py-2">Try again</button>
        <Link href="/" className="border rounded px-5 py-2">Home</Link>
      </div>
    </main>
  );
}
