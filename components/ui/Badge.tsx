import type { ReactNode } from "react";

type Variant = "sale" | "new" | "soldout" | "muted";

const map: Record<Variant, string> = {
  sale: "badge-sale",
  new: "badge-new",
  soldout: "badge-soldout",
  muted: "badge-muted",
};

export default function Badge({
  variant = "muted", className = "", children,
}: { variant?: Variant; className?: string; children: ReactNode }) {
  return <span className={`badge ${map[variant]} ${className}`.trim()}>{children}</span>;
}
