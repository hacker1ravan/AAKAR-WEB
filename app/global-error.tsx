"use client";

// Last resort when even the page frame fails to load
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "4rem 1rem" }}>
        <h1>Something went wrong</h1>
        <p>Please try again in a moment.</p>
        <button onClick={reset} style={{ padding: "0.5rem 1.25rem", cursor: "pointer" }}>Try again</button>
      </body>
    </html>
  );
}
