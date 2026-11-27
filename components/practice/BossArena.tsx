"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { PixelScene } from "@/components/pixel/PixelScene";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { backdropFor, BACKDROP_H, BACKDROP_W } from "@/lib/pixel/sprites/backdrops";
import { BOSS_SIZE, bossFor } from "@/lib/pixel/sprites/bosses";
import { hatOf } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import { heartEmpty, heartFull } from "@/lib/pixel/sprites/ui";
import { cx } from "@/lib/ui";
import { LANTERN_HIT_MS, LanternStrike } from "./LanternStrike";

export type BattleBeat = { id: number; kind: "hit" | "crit" | "hurt" };

/** Positions in backdrop pixels, turned into percentages so sprites share the scene's pixel grid. */
const pct = (v: number, of: number) => `${(v / of) * 100}%`;
/** Nova's raised lantern, and where its light strikes the boss. */
const LANTERN_AT = { x: 16 + 24, y: 45 };
const STRIKE_AT = { x: 70 + BOSS_SIZE / 2, y: 68 - BOSS_SIZE / 2 };

/**
 * The battle scene above each question: the unit's backdrop, Nova on the left, the boss on the
 * right, the boss's HP bar and the student's hearts. Each answer plays a short "beat".
 */
export function BossArena({ unitId, hp, hits, hearts, heartsLeft, beat, message, hat, label, winText = "Victory!" }: { unitId: string; hp: number; hits: number; hearts: number; heartsLeft: number; beat: BattleBeat | null; message: string; hat?: string | null; /** Accessible name (default "Boss battle: <name>"). */ label?: string; winText?: string }) {
  const nova = novaSprites(hatOf(hat));
  const boss = bossFor(unitId);
  const backdrop = useMemo(() => backdropFor(unitId), [unitId]);
  const defeated = hits >= hp;
  const hpLeft = Math.max(0, hp - hits);
  // Which pose each fighter shows right now: a beat swaps in attack/hurt sprites briefly.
  const reduced = useReducedMotion() ?? false;
  const [pose, setPose] = useState<{ id: number; kind: BattleBeat["kind"] } | null>(null);
  /** Nova's light has reached the boss (he flinches only then). */
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (!beat) return;
    const hitAt = reduced ? 0 : LANTERN_HIT_MS;
    const start = setTimeout(() => {
      setPose(beat);
      setLanded(false);
    }, 0);
    const hit = setTimeout(() => setLanded(true), hitAt);
    const end = setTimeout(() => setPose(null), Math.max(750, hitAt + 450));
    return () => {
      clearTimeout(start);
      clearTimeout(hit);
      clearTimeout(end);
    };
  }, [beat, reduced]);
  const striking = pose && pose.kind !== "hurt";
  const struck = pose?.kind === "hurt";
  const novaPose = striking ? nova.attack : struck ? nova.hurt : nova.idle;
  const bossPose = striking && landed ? boss.hurt : struck ? boss.attack : boss.sprite;

  return (
    <section className="pixel-panel relative mx-auto mt-4 w-[calc(100%-8px)] max-w-[30rem] overflow-hidden font-pixel" aria-label={label ?? `Boss battle: ${boss.name}`}>
      <div className="relative" style={{ aspectRatio: `${BACKDROP_W} / ${BACKDROP_H}` }}>
        <PixelScene sprite={backdrop} />

        {/* HUD: boss name + HP, hearts */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-[#241c2bcc] to-transparent p-2 pb-5 sm:p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-none text-[#ece4d6] sm:text-base">{boss.name}</p>
            <div className="mt-1.5 flex max-w-[11rem] gap-[3px] bg-[#241c2b] p-[3px]" role="meter" aria-label="Boss HP" aria-valuemin={0} aria-valuemax={hp} aria-valuenow={hpLeft}>
              {Array.from({ length: hp }, (_, i) => (
                <span key={i} className={cx("h-2.5 flex-1 transition-colors duration-300", i < hpLeft ? (hpLeft <= 2 ? "bg-[#b05a5c]" : "bg-[#a2b47f]") : "bg-[#4b416b]")} />
              ))}
            </div>
          </div>
          {hearts > 0 && <div className="flex shrink-0 gap-1" aria-label={`${heartsLeft} of ${hearts} hearts left`}>
            {Array.from({ length: hearts }, (_, i) => {
              const full = i < heartsLeft;
              const justLost = beat?.kind === "hurt" && i === heartsLeft;
              return (
                <span key={`${i}-${justLost ? beat?.id : 0}`} className="px-anim inline-block" style={justLost ? { animation: "px-heart-break 0.5s ease-out" } : undefined}>
                  <PixelSprite sprite={full ? heartFull : heartEmpty} scale={2} className="sm:hidden" />
                  <PixelSprite sprite={full ? heartFull : heartEmpty} scale={3} className="hidden sm:block" />
                </span>
              );
            })}
          </div>}
        </div>

        {/* Nova */}
        <motion.div
          key={`nova-${beat?.id ?? 0}`}
          className="absolute"
          style={{ left: pct(16, BACKDROP_W), top: pct(65 - nova.idle.h, BACKDROP_H), width: pct(nova.idle.w, BACKDROP_W) }}
          initial={false}
          animate={beat && beat.kind !== "hurt" ? { y: ["0%", "-10%", "0%"] } : beat?.kind === "hurt" ? { x: ["0%", "-12%", "8%", "0%"] } : {}}
          transition={{ duration: beat?.kind === "hurt" ? 0.4 : 0.35, ease: "easeOut" }}
        >
          <div className="px-anim" style={beat?.kind === "hurt" ? { animation: "px-hurt 0.5s steps(2)" } : undefined}>
            <PixelSprite sprite={novaPose} fps={3} className="h-auto w-full" />
          </div>
        </motion.div>

        {/* Boss */}
        <AnimatePresence>
          {!defeated && (
            <motion.div
              key="boss"
              className="absolute"
              style={{ left: pct(70, BACKDROP_W), top: pct(68 - BOSS_SIZE, BACKDROP_H), width: pct(BOSS_SIZE, BACKDROP_W) }}
              exit={{ opacity: 0, scale: 0.3, y: "-30%", filter: "brightness(3)" }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                key={`boss-${beat?.id ?? 0}`}
                initial={false}
                animate={beat?.kind === "hurt" ? { x: ["0%", "-70%", "0%"] } : {}}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div
                  className="px-anim"
                  style={beat && beat.kind !== "hurt" ? { animation: `px-shake 0.35s linear ${reduced ? 0 : LANTERN_HIT_MS / 1000}s, px-flash 0.45s steps(2) ${reduced ? 0 : LANTERN_HIT_MS / 1000}s` } : undefined}
                >
                  <PixelSprite sprite={bossPose} fps={4} className="h-auto w-full" />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nova's strike: a ball of light from her lantern bursts on the boss */}
        {beat && beat.kind !== "hurt" && (
          <div key={`fx-${beat.id}`} className="pointer-events-none absolute inset-0">
            <LanternStrike from={LANTERN_AT} to={STRIKE_AT} w={BACKDROP_W} h={BACKDROP_H} reduced={reduced} />
            <span className="px-anim absolute whitespace-nowrap text-lg text-[#f6e7b8] [text-shadow:2px_2px_0_#241c2b] sm:text-2xl" style={{ left: pct(84, BACKDROP_W), top: pct(34, BACKDROP_H), animation: `px-float-up 1s ease-out ${reduced ? 0 : LANTERN_HIT_MS / 1000}s both` }}>
              {beat.kind === "crit" ? "CRIT! −1" : "−1"}
            </span>
          </div>
        )}
        {beat?.kind === "hurt" && <motion.div key={`hurt-${beat.id}`} className="pointer-events-none absolute inset-0 bg-[#b05a5c]" initial={{ opacity: 0.45 }} animate={{ opacity: 0 }} transition={{ duration: 0.6, delay: 0.15 }} />}

        {/* Victory sparkle where the boss was */}
        {defeated && (
          <motion.div className="pointer-events-none absolute text-center text-xl text-[#f6e7b8] [text-shadow:2px_2px_0_#241c2b] sm:text-3xl" style={{ left: "50%", top: "40%" }} initial={{ opacity: 0, scale: 0.5, x: "-50%" }} animate={{ opacity: 1, scale: 1, x: "-50%" }} transition={{ delay: 0.4, type: "spring" }}>
            {winText}
          </motion.div>
        )}
      </div>
      <p className="min-h-[2.75rem] bg-[#241c2b] px-3 py-2 text-sm leading-snug text-[#ece4d6] sm:text-base" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
