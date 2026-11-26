import type { ReactNode } from "react";

/** A simple elevated surface. Use `hover` for a lift-on-hover effect. */
export default function Card({
  hover = false, className = "", children,
}: { hover?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`card ${hover ? "hover:shadow-[var(--shadow-md)] hover:border-[var(--line-strong)] hover:-translate-y-0.5" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}
