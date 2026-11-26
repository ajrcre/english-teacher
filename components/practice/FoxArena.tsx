"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { PixelScene } from "@/components/pixel/PixelScene";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import type { BattleBeat } from "@/components/practice/BossArena";
import { backdropFor, BACKDROP_H, BACKDROP_W } from "@/lib/pixel/sprites/backdrops";
import { BREAK_SIZE, BUBBLE_BREAK, BUBBLE_FLY, BUBBLE_POP, BUBBLE_SIZE, FOX_H, FOX_W, GREY_FOX } from "@/lib/pixel/sprites/greyFox";
import { hatOf, hatSprite } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import { heartEmpty, heartFull, sword } from "@/lib/pixel/sprites/ui";
import { cx } from "@/lib/ui";
import { RichSentence } from "./inputs";

/** The Grey Fox's question, said in a speech bubble; it reacts to the answer. */
export interface FoxBubble {
  key: string;
  prompt: string;
  sentence?: string;
  state: "ask" | "right" | "wrong";
}

/** Where things stand, in backdrop pixels (the scene is 128×72). */
const FOX_X = 84;
const FOX_Y = 66 - FOX_H;
const NOVA_X = 16;
/** Where the bubble leaves his paw, and where it hits Nova. */
const THROW_FROM = { x: 80, y: FOX_Y + 22 };
const HIT_AT = { x: 30, y: 46 };
const BACKDROP = "grey-fox";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Milliseconds since `since` changed, ticking while under `until` (then it stops). */
function useElapsed(since: number | string | null, until: number): number {
  const [state, setState] = useState<{ since: typeof since; ms: number }>({ since, ms: until });
  useEffect(() => {
    if (since === null) return;
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const ms = performance.now() - start;
      setState({ since, ms });
      if (ms < until) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [since, until]);
  return state.since === since ? state.ms : 0;
}

/**
 * The battle with the Grey Fox. He stands tall on the right; his question comes out of his mouth
 * in a speech bubble under the scene. A right answer stamps a green tick on the bubble and pops it
 * while Nova strikes; a wrong one and he snatches the bubble back, winds up and throws it at Nova,
 * where it shatters. When his lives run out he vanishes and his E hat drops to the ground.
 */
export function FoxArena({ hp, hits, hearts, heartsLeft, beat, message, hat, bubble }: { hp: number; hits: number; hearts: number; heartsLeft: number; beat: BattleBeat | null; message: string; hat?: string | null; bubble: FoxBubble | null }) {
  const reduced = useReducedMotion() ?? false;
  const nova = novaSprites(hatOf(hat));
  const backdrop = useMemo(() => backdropFor(BACKDROP), []);
  const defeated = hits >= hp;
  const hpLeft = Math.max(0, hp - hits);
  const hurtBeat = beat?.kind === "hurt";
  const hitBeat = !!beat && !hurtBeat;

  // Timelines: a wrong answer's throw (~1.4 s), a right answer's strike (~0.8 s), and talking.
  const t = useElapsed(beat ? beat.id : null, 1500);
  const talking = useElapsed(bubble?.state === "ask" ? bubble.key : null, 1300);
  const throwing = hurtBeat && !reduced && t < 640;
  const flying = hurtBeat && !reduced && t >= 300 && t < 660;
  const shattering = hurtBeat && t >= (reduced ? 0 : 640) && t < (reduced ? 600 : 1150);
  const novaHurt = hurtBeat && t >= (reduced ? 0 : 640) && t < 1300;
  const novaStrike = hitBeat && t < 750;
  const foxHit = hitBeat && t >= 180 && t < 750;

  let foxSprite = GREY_FOX.sprite;
  let foxFrame: number | undefined;
  if (throwing) {
    foxSprite = GREY_FOX.throw;
    foxFrame = Math.min(3, Math.floor(t / 160));
  } else if (foxHit) foxSprite = GREY_FOX.hurt;
  else if (bubble?.state === "ask" && talking < 1200 && !reduced) foxSprite = GREY_FOX.talk;

  return (
    <section className="pixel-panel relative mx-auto mt-4 w-[calc(100%-8px)] max-w-[30rem] overflow-hidden font-pixel" aria-label={`Boss battle: ${GREY_FOX.name}`}>
      <div className="relative overflow-hidden" style={{ aspectRatio: `${BACKDROP_W} / ${BACKDROP_H}` }}>
        <PixelScene sprite={backdrop} />

        {/* HUD: his lives, Nova's hearts */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 bg-gradient-to-b from-[#241c2bcc] to-transparent p-2 pb-5 sm:p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-none text-[#ece4d6] sm:text-base">{GREY_FOX.name}</p>
            <div className="mt-1.5 flex max-w-[13rem] gap-[2px] bg-[#241c2b] p-[3px]" role="meter" aria-label="The Grey Fox's lives" aria-valuemin={0} aria-valuemax={hp} aria-valuenow={hpLeft}>
              {Array.from({ length: hp }, (_, i) => (
                <span key={i} className={cx("h-2.5 flex-1 transition-colors duration-300", i < hpLeft ? (hpLeft <= 3 ? "bg-[#e0463c]" : "bg-[#a2b47f]") : "bg-[#4b416b]")} />
              ))}
            </div>
          </div>
          <div className="flex shrink-0 gap-1" aria-label={`${heartsLeft} of ${hearts} hearts left`}>
            {Array.from({ length: hearts }, (_, i) => {
              const full = i < heartsLeft;
              const justLost = hurtBeat && i === heartsLeft && t >= 640;
              return (
                <span key={`${i}-${justLost ? beat?.id : 0}`} className="px-anim inline-block" style={justLost ? { animation: "px-heart-break 0.5s ease-out" } : undefined}>
                  <PixelSprite sprite={full ? heartFull : heartEmpty} scale={2} className="sm:hidden" />
                  <PixelSprite sprite={full ? heartFull : heartEmpty} scale={3} className="hidden sm:block" />
                </span>
              );
            })}
          </div>
        </div>

        {/* Nova */}
        <motion.div
          key={`nova-${hitBeat ? beat?.id : 0}`}
          className="absolute"
          style={{ left: pct(NOVA_X, BACKDROP_W), top: pct(65 - nova.idle.h, BACKDROP_H), width: pct(nova.idle.w, BACKDROP_W) }}
          initial={false}
          animate={hitBeat && !reduced ? { x: ["0%", "120%", "0%"] } : {}}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="px-anim" style={novaHurt ? { animation: "px-hurt 0.5s steps(2)" } : undefined}>
            <PixelSprite sprite={novaStrike ? nova.attack : novaHurt ? nova.hurt : nova.idle} fps={3} className="h-auto w-full" />
          </div>
        </motion.div>

        {/* The Grey Fox */}
        <AnimatePresence>
          {!defeated && (
            <motion.div
              key="fox"
              className="absolute"
              style={{ left: pct(FOX_X, BACKDROP_W), top: pct(FOX_Y, BACKDROP_H), width: pct(FOX_W, BACKDROP_W) }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4, y: "-20%", filter: "brightness(3)" }}
              transition={{ duration: 0.6 }}
            >
              <div className="px-anim" style={foxHit ? { animation: "px-shake 0.35s linear, px-flash 0.45s steps(2)" } : undefined}>
                <PixelSprite sprite={foxSprite} frame={foxFrame} fps={foxSprite === GREY_FOX.talk ? 6 : 4} className="h-auto w-full" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nova's strike */}
        {hitBeat && t < 1100 && (
          <div key={`fx-${beat!.id}`} className="pointer-events-none absolute" style={{ left: pct(FOX_X - 4, BACKDROP_W), top: pct(FOX_Y + 12, BACKDROP_H), width: pct(18, BACKDROP_W) }}>
            <motion.div initial={{ opacity: 0, rotate: -40, scale: 0.6 }} animate={{ opacity: [0, 1, 0], rotate: [-40, 30], scale: [0.6, 1.2] }} transition={{ duration: 0.45, delay: 0.15 }}>
              <PixelSprite sprite={sword} className="h-auto w-full" />
            </motion.div>
            <span className="px-anim absolute left-1/2 top-0 whitespace-nowrap text-lg text-[#f6e7b8] [text-shadow:2px_2px_0_#241c2b] sm:text-2xl" style={{ animation: "px-float-up 1s ease-out 0.2s both" }}>
              {beat!.kind === "crit" ? "CRIT! −1" : "−1"}
            </span>
          </div>
        )}

        {/* The thrown bubble: tumbling through the air in an arc… */}
        {flying && (
          <motion.div
            key={`fly-${beat!.id}`}
            className="pointer-events-none absolute"
            style={{ width: pct(BUBBLE_SIZE, BACKDROP_W), marginLeft: pct(-BUBBLE_SIZE / 2, BACKDROP_W), marginTop: pct(-BUBBLE_SIZE / 2, BACKDROP_W) }}
            initial={{ left: pct(THROW_FROM.x, BACKDROP_W), top: pct(THROW_FROM.y, BACKDROP_H) }}
            animate={{ left: [pct(THROW_FROM.x, BACKDROP_W), pct((THROW_FROM.x + HIT_AT.x) / 2, BACKDROP_W), pct(HIT_AT.x, BACKDROP_W)], top: [pct(THROW_FROM.y, BACKDROP_H), pct(Math.min(THROW_FROM.y, HIT_AT.y) - 14, BACKDROP_H), pct(HIT_AT.y, BACKDROP_H)] }}
            transition={{ duration: 0.36, ease: "linear" }}
          >
            <PixelSprite sprite={BUBBLE_FLY} frame={Math.floor(t / 70) % 4} className="h-auto w-full" />
          </motion.div>
        )}
        {/* …and shattering on Nova */}
        {shattering && (
          <div key={`break-${beat!.id}`} className="pointer-events-none absolute" style={{ left: pct(HIT_AT.x - BREAK_SIZE / 2, BACKDROP_W), top: pct(HIT_AT.y - BREAK_SIZE / 2, BACKDROP_H), width: pct(BREAK_SIZE, BACKDROP_W) }}>
            <PixelSprite sprite={BUBBLE_BREAK} frame={reduced ? 2 : Math.min(5, Math.floor((t - 640) / 85))} className="h-auto w-full" />
          </div>
        )}
        {novaHurt && <motion.div key={`hurt-${beat!.id}`} className="pointer-events-none absolute inset-0 bg-[#b05a5c]" initial={{ opacity: 0.45 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />}

        {/* Beaten: he vanishes in a pop, and his hat drops to the ground */}
        {defeated && (
          <>
            <motion.div className="pointer-events-none absolute" style={{ left: pct(FOX_X - 4, BACKDROP_W), top: pct(FOX_Y + 6, BACKDROP_H), width: pct(44, BACKDROP_W) }} initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
              <PixelSprite sprite={BUBBLE_POP} fps={8} className="h-auto w-full" />
            </motion.div>
            <motion.div
              className="absolute"
              style={{ left: pct(FOX_X + 10, BACKDROP_W), width: pct(16, BACKDROP_W) }}
              initial={reduced ? { top: pct(52, BACKDROP_H) } : { top: pct(FOX_Y, BACKDROP_H), rotate: -25, opacity: 0 }}
              animate={{ top: pct(52, BACKDROP_H), rotate: 0, opacity: 1 }}
              transition={reduced ? { duration: 0 } : { delay: 0.45, type: "spring", stiffness: 260, damping: 9 }}
            >
              <PixelSprite sprite={hatSprite("e")} className="h-auto w-full" title="The Grey Fox's E hat" />
            </motion.div>
            <motion.div className="pointer-events-none absolute text-center text-xl text-[#f6e7b8] [text-shadow:2px_2px_0_#241c2b] sm:text-3xl" style={{ left: "50%", top: "30%" }} initial={{ opacity: 0, scale: 0.5, x: "-50%" }} animate={{ opacity: 1, scale: 1, x: "-50%" }} transition={{ delay: 0.9, type: "spring" }}>
              Victory!
            </motion.div>
          </>
        )}
      </div>

      {/* His speech bubble, its tail pointing up to his mouth */}
      <div className="relative min-h-[5.5rem] bg-[#241c2b] px-3 pb-2 pt-3">
        <AnimatePresence mode="popLayout">
          {bubble && !defeated && (
            <motion.div
              key={bubble.key}
              className="relative origin-[73%_0%] border-2 border-[#0f0b14] bg-[#f3e3b8] px-3 py-2 text-[#2b1f17] shadow-[3px_3px_0_#0f0b1466]"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.2, y: -16 }}
              animate={
                bubble.state === "ask"
                  ? { opacity: 1, scale: 1, y: 0 }
                  : bubble.state === "right"
                    ? reduced
                      ? { opacity: 0.5 }
                      : { opacity: [1, 1, 1, 0], scale: [1, 1, 1.08, 0.2], transition: { duration: 0.95, times: [0, 0.55, 0.7, 1] } }
                    : reduced
                      ? { opacity: 0.5 }
                      : { opacity: [1, 1, 0], scale: [1, 0.85, 0.1], x: ["0%", "10%", "25%"], y: [0, -20, -60], transition: { duration: 0.32 } }
              }
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ type: "spring", stiffness: 380, damping: 22 }}
              role="status"
              aria-live="polite"
              data-bubble={bubble.state}
            >
              <span aria-hidden className="absolute -top-[10px] right-[24%] h-0 w-0 border-x-[8px] border-b-[10px] border-x-transparent border-b-[#0f0b14]" />
              <span aria-hidden className="absolute -top-[6px] right-[calc(24%+2px)] h-0 w-0 border-x-[6px] border-b-[7px] border-x-transparent border-b-[#f3e3b8]" />
              <p className="text-[11px] uppercase tracking-widest text-[#776a9c]">{GREY_FOX.name} asks:</p>
              <p className="font-sans text-base font-semibold leading-snug sm:text-lg">{bubble.prompt}</p>
              {bubble.sentence && <RichSentence text={bubble.sentence} className="mt-1 font-sans text-base leading-snug sm:text-lg" />}
              {/* A right answer: a big green tick stamped on the bubble, then it pops */}
              {bubble.state === "right" && (
                <>
                  <motion.svg viewBox="0 0 12 10" className="absolute right-2 top-1/2 h-12 w-12 -translate-y-1/2 [image-rendering:pixelated]" initial={{ scale: 0, rotate: -20 }} animate={{ scale: [0, 1.35, 1], rotate: 0 }} transition={{ duration: 0.35 }} aria-label="Right!">
                    <path d="M1 5h2v1h1v1h1V6h1V5h1V4h1V3h1V2h1V1h1v2h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1H4V8H3V7H2V6H1z" fill="#3e5741" transform="translate(0.6 0.6)" />
                    <path d="M1 5h2v1h1v1h1V6h1V5h1V4h1V3h1V2h1V1h1v2h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1H4V8H3V7H2V6H1z" fill="#7cc46a" />
                  </motion.svg>
                  {!reduced && (
                    <motion.div className="pointer-events-none absolute left-1/2 top-1/2 w-24 -translate-x-1/2 -translate-y-1/2" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ delay: 0.5, duration: 0.45 }}>
                      <PixelSprite sprite={BUBBLE_POP} fps={9} className="h-auto w-full" />
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-2 text-sm leading-snug text-[#ece4d6]" aria-live="polite">
          {message}
        </p>
      </div>
    </section>
  );
}
