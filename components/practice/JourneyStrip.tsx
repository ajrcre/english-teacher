"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { PixelScene } from "@/components/pixel/PixelScene";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { backdropFor, BACKDROP_W } from "@/lib/pixel/sprites/backdrops";
import { hatOf } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import { chests } from "@/lib/pixel/sprites/ui";

export type JourneyBeat = { id: number; kind: "step" | "dash" | "trip" };

/** The strip shows this band of the unit's backdrop (in backdrop pixels). */
const BAND_TOP = 26;
const BAND_H = 42;
/** Ground line Nova walks on, in backdrop pixels. */
const GROUND = 64;
const CHEST_X = 108;
const START_X = 2;

const pctX = (v: number) => `${(v / BACKDROP_W) * 100}%`;
const pctY = (v: number) => `${((v - BAND_TOP) / BAND_H) * 100}%`;

/**
 * Nova's journey through a round: a pixel-art strip of the current unit's world in place of a
 * plain progress bar. Nova walks a step with every answer (runs on a combo, stumbles on a
 * mistake) towards a treasure chest that opens when the round is done.
 */
export function JourneyStrip({ unitId, progress, beat, done, hat }: { unitId: string; progress: number; beat: JourneyBeat | null; done: boolean; hat?: string | null }) {
  const nova = novaSprites(hatOf(hat));
  const backdrop = useMemo(() => backdropFor(unitId), [unitId]);
  const [moving, setMoving] = useState<JourneyBeat["kind"] | null>(null);

  useEffect(() => {
    if (!beat) return;
    const start = setTimeout(() => setMoving(beat.kind), 0);
    const end = setTimeout(() => setMoving(null), beat.kind === "trip" ? 900 : 1100);
    return () => {
      clearTimeout(start);
      clearTimeout(end);
    };
  }, [beat]);

  const p = Math.max(0, Math.min(1, progress));
  const novaX = done ? CHEST_X - nova.walk.w + 2 : START_X + p * (CHEST_X - nova.walk.w - START_X - 2);
  const pose = done ? nova.jump : moving === "trip" ? nova.trip : moving === "dash" ? nova.run : moving === "step" ? nova.walk : nova.sit;
  const percent = Math.round(p * 100);

  return (
    <div
      className="pixel-panel relative mt-3 overflow-hidden"
      style={{ aspectRatio: `${BACKDROP_W} / ${BAND_H}` }}
      role="progressbar"
      aria-label="Round progress"
      aria-valuenow={done ? 100 : percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* The unit's world; crossfades when the next question comes from another unit. */}
      <AnimatePresence initial={false}>
        <motion.div key={unitId} className="absolute inset-x-0" style={{ top: `${(-BAND_TOP / BAND_H) * 100}%` }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          <PixelScene sprite={backdrop} />
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0d1a2b55] to-transparent" />

      {/* Footprints along the path already walked */}
      <div className="absolute h-[3%] bg-[#ead39b44]" style={{ left: pctX(START_X + 6), top: pctY(GROUND + 1), width: `${Math.max(0, ((novaX - START_X) / BACKDROP_W) * 100)}%` }} />

      {/* The chest waiting at the end */}
      <div className="absolute" style={{ left: pctX(CHEST_X), top: pctY(GROUND - chests.wood.closed.h + 1), width: pctX(chests.wood.closed.w) }}>
        <div className="px-anim" style={done ? undefined : { animation: "px-bob 1.8s ease-in-out infinite" }}>
          <PixelSprite sprite={done ? chests.wood.open : chests.wood.closed} className="h-auto w-full" />
        </div>
        {done && (
          <span className="px-anim absolute -top-1/2 left-1/2 font-pixel text-[#f6e7b8] [text-shadow:1px_1px_0_#241c2b]" style={{ animation: "px-float-up 1.6s ease-out infinite" }}>
            ✦
          </span>
        )}
      </div>

      {/* Nova */}
      <motion.div
        className="absolute"
        style={{ top: pctY(GROUND - nova.walk.h + 1), width: pctX(nova.walk.w) }}
        initial={false}
        animate={{ left: pctX(novaX), y: done ? ["0%", "-25%", "0%"] : "0%" }}
        transition={{ left: { duration: moving === "dash" ? 0.6 : 1, ease: "easeInOut" }, y: { duration: 0.6, repeat: done ? Infinity : 0, repeatDelay: 0.4 } }}
      >
        <PixelSprite sprite={pose} fps={moving === "dash" ? 10 : 7} className="h-auto w-full" />
        {moving === "trip" && <span className="absolute -top-1/2 left-1/2 -translate-x-1/2 font-pixel text-lg leading-none text-[#ead39b] [text-shadow:1px_1px_0_#241c2b]">!</span>}
      </motion.div>

      <span className="absolute right-2 top-1 font-pixel text-xs text-[#ece4d6] [text-shadow:1px_1px_0_#241c2b]">{done ? "Treasure!" : `${percent}%`}</span>
    </div>
  );
}
