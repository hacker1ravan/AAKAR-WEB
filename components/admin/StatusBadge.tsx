// Color-coded status pill for admin tables (orders, returns, reviews).
// Display-only: it maps a status string to a semantic tone. The status word is
// always shown as text, so meaning never depends on color alone (WCAG 1.4.1).

type Tone = "ok" | "warn" | "danger" | "neutral";

const toneClass: Record<Tone, string> = {
  ok: "text-[var(--ok)] bg-[color-mix(in_oklab,var(--ok)_12%,transparent)]",
  warn: "text-[var(--warn)] bg-[color-mix(in_oklab,var(--warn)_14%,transparent)]",
  danger: "text-[var(--danger)] bg-[color-mix(in_oklab,var(--danger)_11%,transparent)]",
  neutral: "text-[var(--ink-soft)] bg-[var(--surface-2)] ring-1 ring-[var(--line)]",
};

// Covers order, return and review statuses used across the admin.
const toneOf: Record<string, Tone> = {
  pending: "neutral",
  paid: "ok",
  processing: "warn",
  shipped: "warn",
  delivered: "ok",
  cancelled: "danger",
  requested: "warn",
  approved: "ok",
  received: "ok",
  refunded: "ok",
  rejected: "danger",
};

export default function StatusBadge({ status }: { status: string }) {
  const tone = toneOf[status] ?? "neutral";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize ${toneClass[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {status}
    </span>
  );
}
