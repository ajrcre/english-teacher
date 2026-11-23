"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { playSfx } from "@/components/sound";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { STICKER_BY_ID, type ChestContents } from "@/lib/gamification/collection";
import { stickerArt } from "@/lib/pixel/sprites/stickers";
import { chests, pixelStar } from "@/lib/pixel/sprites/ui";
import { cx } from "@/lib/ui";

const RARITY_STYLE = {
  common: { label: "Common", color: "text-[#ddd1bd]" },
  rare: { label: "Rare", color: "text-[#9cc2b9]" },
  legendary: { label: "Legendary", color: "text-[#ead39b]" },
};

/** A treasure chest the student taps to open. The contents were decided by the server. */
export function ChestReveal({ contents, onOpened }: { contents: ChestContents; onOpened?: () => void }) {
  const [state, setState] = useState<"closed" | "opening" | "open">("closed");
  const sticker = contents.sticker ? STICKER_BY_ID.get(contents.sticker) : undefined;
  const chest = chests[contents.tier];

  function open() {
    if (state !== "closed") return;
    setState("opening");
    playSfx("tap");
    setTimeout(() => {
      setState("open");
      playSfx(sticker?.rarity === "legendary" ? "badge" : "star");
      onOpened?.();
    }, 650);
  }

  return (
    <div className="pixel-panel mx-auto w-full max-w-sm p-4 text-center font-pixel">
      <p className="text-sm uppercase tracking-widest text-[#ead39b]">{contents.tier === "boss" ? "Boss chest" : "Treasure chest"}</p>
      <button
        type="button"
        onClick={open}
        disabled={state !== "closed"}
        className="relative mx-auto mt-2 grid h-44 w-full place-items-center disabled:cursor-default"
        aria-label={state === "open" ? "Chest opened" : "Open the treasure chest"}
      >
        {state === "open" && (
          <span
            aria-hidden="true"
            className="px-anim absolute h-44 w-44 rounded-full opacity-60"
            style={{ background: "repeating-conic-gradient(from 0deg, #ead39b55 0deg 12deg, transparent 12deg 30deg)", animation: "px-rays 8s linear infinite" }}
          />
        )}
        <span
          className={cx("px-anim relative", state === "closed" && "cursor-pointer")}
          style={{ animation: state === "closed" ? "px-wiggle 1.2s ease-in-out infinite" : state === "opening" ? "px-shake 0.2s linear infinite" : undefined }}
        >
          <PixelSprite sprite={state === "open" ? chest.open : chest.closed} scale={7} />
        </span>
        {state === "closed" && <span className="absolute bottom-0 text-base text-[#ece4d6]">Tap to open!</span>}
      </button>
      <AnimatePresence>
        {state === "open" && (
          <motion.div initial={{ opacity: 0, y: 16, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="mt-1" role="status">
            {sticker ? (
              <div className="flex items-center justify-center gap-4">
                <span className="grid h-20 w-20 place-items-center bg-[#241c2b] shadow-[inset_0_0_0_3px_#4b416b]">
                  <PixelSprite sprite={stickerArt(sticker.id)} scale={sticker.rarity === "legendary" ? 2 : 4} />
                </span>
                <div className="text-left">
                  <p className={cx("text-xs uppercase tracking-widest", RARITY_STYLE[sticker.rarity].color)}>{RARITY_STYLE[sticker.rarity].label} sticker</p>
                  <p className="text-xl text-[#ece4d6]">{sticker.title}</p>
                  <p className="text-sm text-[#a99cc4]">{contents.duplicate ? `Already in your album, so +${contents.stars} stars!` : "Added to your album!"}</p>
                </div>
              </div>
            ) : (
              <p className="flex items-center justify-center gap-2 text-2xl text-[#ead39b]">
                <PixelSprite sprite={pixelStar} scale={3} />+{contents.stars} stars
              </p>
            )}
            {sticker && !contents.duplicate && contents.stars > 0 && (
              <p className="mt-2 flex items-center justify-center gap-1 text-[#ead39b]">
                <PixelSprite sprite={pixelStar} scale={2} />+{contents.stars} stars
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
