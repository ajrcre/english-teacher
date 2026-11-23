"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { SHOP_AVATAR_ART } from "@/lib/pixel/sprites/avatars";
import { cx } from "@/lib/ui";

/** An image from /public/art that degrades to a tasteful placeholder if the file is missing. */
export function Art({ src, alt, className, style, fallback }: { src: string; alt: string; className?: string; style?: CSSProperties; fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    // The image may have failed before hydration attached onError.
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);
  if (failed) {
    return (
      <div aria-label={alt} role="img" className={cx("grid place-items-center bg-ink-800 text-amber-400", className)} style={style}>
        {fallback ?? <StarGlyph className="h-1/3 w-1/3" />}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt={alt} className={className} style={style} onError={() => setFailed(true)} draggable={false} />;
}

export function StarGlyph({ className, filled = true }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2.5l2.6 6.6 7 .5-5.4 4.5 1.8 6.9L12 17.2 6 21l1.8-6.9L2.4 9.6l7-.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Avatar({ avatar, name, size = 48, className, frame }: { avatar: string; name: string; size?: number; className?: string; frame?: string | null }) {
  const pixel = avatar.startsWith("px-") ? SHOP_AVATAR_ART[avatar.slice(3)] : undefined;
  const inner = pixel ? (
    <span role="img" aria-label={name} className={cx("grid place-items-center overflow-hidden rounded-full bg-ink-800 ring-2 ring-white/10", className)} style={{ width: size, height: size }}>
      <PixelSprite sprite={pixel} scale={size / pixel.w} />
    </span>
  ) : (
    <Art
      src={`/art/avatars/${avatar}.webp`}
      alt={name}
      className={cx("rounded-full object-cover ring-2 ring-white/10", className)}
      style={{ width: size, height: size }}
      fallback={<span className="font-display text-lg font-semibold text-amber-300">{name.slice(0, 1).toUpperCase()}</span>}
    />
  );
  if (!frame) return inner;
  return <span className={cx("avatar-frame", `frame-${frame.replace(/^frame-/, "")}`)}>{inner}</span>;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-display text-xl font-semibold tracking-tight", className)}>
      <StarGlyph className="h-5 w-5 text-amber-400" />
      Starlight English
    </span>
  );
}
