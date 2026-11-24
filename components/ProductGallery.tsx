"use client";
import { useEffect, useRef, useState } from "react";
import Photo from "./Photo";

/**
 * Product image gallery. On mobile it's a horizontal snap-scroller (scrollbar
 * hidden); on desktop the images stack vertically. On mobile we add dot
 * indicators that track the scroll position so shoppers can see — and that
 * there is more than one image to swipe to. Dots are decorative (the images
 * carry the alt text), so they're aria-hidden.
 */
export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || images.length < 2) return;
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
  }, [images.length]);

  return (
    <div>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto md:grid md:grid-cols-1 md:gap-4 md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((u, idx) => (
          <Photo
            key={u}
            src={u}
            alt={alt}
            width={900}
            priority={idx === 0}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="aspect-[3/4] w-full shrink-0 basis-full snap-center rounded-[var(--radius-lg)] object-cover ring-1 ring-[var(--line)]"
          />
        ))}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 md:hidden" aria-hidden="true">
          {images.map((u, idx) => (
            <span
              key={u}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === active ? "w-5 bg-[var(--accent)]" : "w-1.5 bg-[var(--line-strong)]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
