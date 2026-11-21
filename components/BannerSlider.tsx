"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cld, cldSet } from "@/lib/img";

type B = { id: string; imageUrl: string; title: string; subtitle: string; buttonText: string; linkUrl: string };

function Wrap({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  if (href.startsWith("/")) return <Link href={href} className={className}>{children}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
  return <div className={className}>{children}</div>;
}

export default function BannerSlider({ banners }: { banners: B[] }) {
  const n = banners.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (n < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5000);
    return () => clearInterval(t);
  }, [n, paused]);

  const arrow =
    "absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full bg-[var(--surface)]/85 text-xl text-[var(--ink)] shadow-[var(--shadow-sm)] backdrop-blur transition hover:bg-[var(--surface)]";

  return (
    <section
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="relative aspect-[16/9] md:aspect-[16/5] bg-[var(--surface-2)]">
        {banners.map((b, idx) => (
          <div
            key={b.id}
            aria-hidden={idx !== i}
            className={`absolute inset-0 transition-opacity duration-500 ${idx === i ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <Wrap href={b.linkUrl} className="block w-full h-full relative">
              <img src={cld(b.imageUrl, 1600)} srcSet={cldSet(b.imageUrl, [800, 1600, 2400])} sizes="100vw" alt={b.title} loading={idx === 0 ? "eager" : "lazy"} className="w-full h-full object-cover" />
              {(b.title || b.subtitle || b.buttonText) && (
                <div className="absolute inset-0 flex flex-col items-start justify-end gap-3 bg-gradient-to-t from-black/65 via-black/15 to-transparent p-5 md:p-12 text-white">
                  {b.title && (
                    <h2 className="max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
                      {b.title}
                    </h2>
                  )}
                  {b.subtitle && <p className="max-w-xl text-sm text-white/90 md:text-lg">{b.subtitle}</p>}
                  {b.buttonText && b.linkUrl && (
                    <span className="btn btn-primary btn-lg mt-1">{b.buttonText}</span>
                  )}
                </div>
              )}
            </Wrap>
          </div>
        ))}
      </div>

      {n > 1 && (
        <>
          <button type="button" aria-label="Previous banner" className={`${arrow} left-2`} onClick={() => setI((i - 1 + n) % n)}>‹</button>
          <button type="button" aria-label="Next banner" className={`${arrow} right-2`} onClick={() => setI((i + 1) % n)}>›</button>
          <div className="absolute bottom-3 inset-x-0 z-10 flex justify-center gap-2">
            {banners.map((b, idx) => (
              <button key={b.id} type="button" aria-label={`Banner ${idx + 1}`} onClick={() => setI(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === i ? "w-6 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
