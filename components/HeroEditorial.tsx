import Link from "next/link";
import Photo from "@/components/Photo";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Editorial storefront hero: a full-width landscape image that fades into the
 * page, with a tagline on the left and a serif headline + description + CTAs on
 * the right. Presentational only. Adapted to the store design system
 * (--surface / --ink / --ink-soft tokens, .container-x, .eyebrow, ButtonLink).
 * Design reference: 21st.dev "Editorial Image Hero" (hero-07).
 */
export default function HeroEditorial({
  eyebrow,
  title,
  description,
  image,
  imageAlt = "",
  primaryHref = "/products",
  primaryLabel = "Shop now",
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  image?: string | null;
  imageAlt?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const hasImage = Boolean(image);
  return (
    <section className="relative isolate w-full overflow-hidden bg-[var(--surface)]">
      {hasImage && (
        <div className="relative w-full overflow-hidden">
          <Photo
            src={image as string}
            alt={imageAlt}
            width={1600}
            sizes="100vw"
            priority
            className="aspect-[16/10] w-full object-cover object-center sm:aspect-[2/1] lg:aspect-[9/4]"
          />
          {/* subtle darkening for legibility of any overlaid text, plus a fade into the page */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--surface)] via-transparent to-transparent"
          />
        </div>
      )}

      <div
        className={`container-x grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-10 ${
          hasImage ? "pb-14 pt-9 sm:pb-20 sm:pt-12" : "py-20 sm:py-28"
        }`}
      >
        {eyebrow && (
          <div className="lg:col-span-4 lg:col-start-1">
            <p className="eyebrow max-w-xs">{eyebrow}</p>
          </div>
        )}
        <div
          className={`flex flex-col items-start gap-5 ${
            eyebrow ? "lg:col-span-7 lg:col-start-6" : "lg:col-span-9 lg:col-start-1"
          }`}
        >
          <h1 className="text-balance font-serif text-4xl font-semibold tracking-tight text-[var(--ink)] md:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-xl text-pretty text-base leading-relaxed text-[var(--ink-soft)]">
              {description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            <ButtonLink href={primaryHref} size="lg">
              {primaryLabel}
            </ButtonLink>
            {secondaryHref && secondaryLabel && (
              <Link href={secondaryHref} className="link-underline text-sm">
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
