import { cld, cldSet } from "@/lib/img";

// A responsive, lazy-loaded image. `width` is the largest size it is shown at, in CSS pixels.
export default function Photo({
  src, alt, width, sizes, className, priority = false,
}: { src: string; alt: string; width: number; sizes?: string; className?: string; priority?: boolean }) {
  return (
    <img
      src={cld(src, width)}
      srcSet={cldSet(src, [Math.round(width / 2), width, width * 2])}
      sizes={sizes}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
