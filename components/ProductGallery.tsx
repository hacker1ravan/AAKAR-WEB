"use client";
import { useEffect, useRef, useState } from "react";
import Photo from "./Photo";

/**
 * Product image gallery.
 *
 * The main stage is a horizontal snap-scroller, so touch users keep the natural
 * swipe gesture. On top of it we layer a thumbnail strip (tab pattern, arrow-key
 * navigable), desktop prev/next arrows, and a live image counter — the standard
 * PDP pattern that lets shoppers jump straight to any shot instead of scrolling
 * a tall stack of images.
 *
 * Presentational only: same `{ images, alt }` contract as before. The thumbnails
 * are decorative duplicates of the stage images (alt="") so screen readers read
 * each product photo once, from the stage.
 */
export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const multi = images.length > 1;

  // Keep `active` in sync with the stage's scroll position (swipe or arrows).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !multi) return;
    const slides = Array.from(el.children) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = slides.indexOf(e.target as HTMLElement);
            if (idx >= 0) setActive(idx);
          }
        }
      },
      { root: el, threshold: 0.6 },
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [images.length, multi]);

  // Scroll the stage to image `idx` (wrapping). Honour reduced-motion.
  const go = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const n = (idx + images.length) % images.length;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    (el.children[n] as HTMLElement | undefined)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      inline: "start",
      block: "nearest",
    });
  };

  return (
    <div className="space-y-3">
      {/* Main stage */}
      <div className="group relative">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-[var(--radius-lg)] ring-1 ring-[var(--line)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((u, idx) => (
            <Photo
              key={u}
              src={u}
              alt={multi ? `${alt} — view ${idx + 1} of ${images.length}` : alt}
              width={900}
              priority={idx === 0}
              sizes="(min-width: 768px) 50vw, 100vw"
              className="aspect-[3/4] w-full shrink-0 basis-full snap-center object-cover"
            />
          ))}
        </div>

        {multi && (
          <>
            {/* Image counter */}
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[var(--ink)]/70 px-2.5 py-1 text-xs font-medium text-white tabular-nums backdrop-blur-sm">
              {active + 1} / {images.length}
            </span>

            {/* Desktop arrows (mobile relies on swipe + thumbnails) */}
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(active - 1)}
              className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]/85 text-[var(--ink)] shadow-md backdrop-blur-sm transition hover:bg-[var(--surface)] hover:scale-105 active:scale-95 md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(active + 1)}
              className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]/85 text-[var(--ink)] shadow-md backdrop-blur-sm transition hover:bg-[var(--surface)] hover:scale-105 active:scale-95 md:flex md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <Chevron dir="right" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {multi && (
        <div
          ref={stripRef}
          role="tablist"
          aria-label="Product images"
          className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onKeyDown={(e) => {
            let next = active;
            if (e.key === "ArrowRight") next = (active + 1) % images.length;
            else if (e.key === "ArrowLeft") next = (active - 1 + images.length) % images.length;
            else if (e.key === "Home") next = 0;
            else if (e.key === "End") next = images.length - 1;
            else return;
            e.preventDefault();
            go(next);
            stripRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
          }}
        >
          {images.map((u, idx) => {
            const selected = active === idx;
            return (
              <button
                key={u}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-label={`Show image ${idx + 1} of ${images.length}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => go(idx)}
                className={`relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-[var(--radius-sm)] transition ${
                  selected
                    ? "opacity-100 ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg)]"
                    : "opacity-60 ring-1 ring-[var(--line)] hover:opacity-100"
                }`}
              >
                <Photo src={u} alt="" width={160} className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}
