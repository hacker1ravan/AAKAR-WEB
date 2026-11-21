import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger" | "link";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  dark: "btn-dark",
  outline: "btn-outline",
  ghost: "btn-ghost",
  danger: "btn-danger",
  link: "btn-link",
};
const sizes: Record<Size, string> = { sm: "btn-sm", md: "", lg: "btn-lg" };

function classes(variant: Variant, size: Size, block?: boolean, extra?: string) {
  return ["btn", variants[variant], sizes[size], block ? "btn-block" : "", extra || ""]
    .filter(Boolean)
    .join(" ");
}

type Common = { variant?: Variant; size?: Size; block?: boolean; className?: string; children: ReactNode };

/** A styled link that looks like a button. */
export function ButtonLink({
  href, variant = "primary", size = "md", block, className, children, ...rest
}: Common & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={classes(variant, size, block, className)} {...rest}>
      {children}
    </Link>
  );
}

/** A styled <button>. */
export default function Button({
  variant = "primary", size = "md", block, className, children, ...rest
}: Common & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button className={classes(variant, size, block, className)} {...rest}>
      {children}
    </button>
  );
}
