"use client";

import { Art, StarGlyph } from "@/components/Art";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import type { BadgeDef } from "@/lib/gamification/badges";
import { chests, heartFull, sword } from "@/lib/pixel/sprites/ui";
import { badgeArt, cx } from "@/lib/ui";

const PIXEL = { sword, chest: chests.boss.closed, heart: heartFull };

/** A badge's icon: painted art for the classic badges, pixel art for the battle badges. */
export function BadgeIcon({ badge, earned = true, size = 80, className }: { badge: Pick<BadgeDef, "icon" | "pixel">; earned?: boolean; size?: number; className?: string }) {
  if (badge.pixel) {
    const s = PIXEL[badge.pixel];
    return (
      <span className={cx("mx-auto grid place-items-center rounded-full bg-[#2d2744] shadow-[inset_0_0_0_3px_#4b416b]", !earned && "opacity-25 grayscale", className)} style={{ width: size, height: size }}>
        <PixelSprite sprite={s} scale={Math.max(2, Math.floor((size * 0.6) / Math.max(s.w, s.h)))} />
      </span>
    );
  }
  return <Art src={badgeArt(badge.icon)} alt="" className={cx("mx-auto rounded-full object-cover", !earned && "opacity-25 grayscale", className)} style={{ width: size, height: size }} fallback={<StarGlyph className="h-8 w-8" filled={earned} />} />;
}
