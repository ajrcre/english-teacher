"use client";

import { useEffect, useState } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BURST_SIZE, lightBurst, lightOrb, ORB_SIZE } from "@/lib/pixel/sprites/lantern";

/** When the light reaches the foe (ms after the strike starts): his reaction starts then. */
export const LANTERN_HIT_MS = 420;
const LAUNCH_MS = 120;
const BURST_FRAME_MS = 90;
const DONE_MS = LANTERN_HIT_MS + BURST_FRAME_MS * 4 + 40;

type Point = { x: number; y: number };

/**
 * Nova's attack: a ball of light leaves her raised lantern, flies in a low arc to the foe and
 * bursts on him. Positions are in the backdrop's pixels (`w`×`h`), like the arena's sprites.
 * With reduced motion only the burst shows.
 */
export function LanternStrike({ from, to, w, h, reduced = false }: { from: Point; to: Point; w: number; h: number; reduced?: boolean }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const ms = performance.now() - start;
      setT(ms);
      if (ms < DONE_MS) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;
  const flying = !reduced && t >= LAUNCH_MS && t < LANTERN_HIT_MS;
  const bursting = t >= (reduced ? 0 : LANTERN_HIT_MS) && t < DONE_MS;
  const p = Math.min(1, Math.max(0, (t - LAUNCH_MS) / (LANTERN_HIT_MS - LAUNCH_MS)));
  const orb = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p - Math.sin(p * Math.PI) * 6 };
  const frame = reduced ? 2 : Math.min(3, Math.floor((t - LANTERN_HIT_MS) / BURST_FRAME_MS));

  return (
    <div className="pointer-events-none absolute inset-0" data-strike="lantern">
      {flying && (
        <>
          {/* a short trail of light behind the ball */}
          {[0.3, 0.6].map((back) => {
            const q = Math.max(0, p - back * 0.25);
            const tx = from.x + (to.x - from.x) * q;
            const ty = from.y + (to.y - from.y) * q - Math.sin(q * Math.PI) * 6;
            return <span key={back} className="absolute bg-[#ead39b]" style={{ left: pct(tx - 1, w), top: pct(ty - 1, h), width: pct(2, w), height: pct(2, h), opacity: 0.7 - back * 0.6 }} />;
          })}
          <div className="absolute" style={{ left: pct(orb.x - ORB_SIZE / 2, w), top: pct(orb.y - ORB_SIZE / 2, h), width: pct(ORB_SIZE, w) }}>
            <PixelSprite sprite={lightOrb} frame={Math.floor(t / 60) % 3} className="h-auto w-full" />
          </div>
        </>
      )}
      {bursting && (
        <div className="absolute" style={{ left: pct(to.x - BURST_SIZE / 2, w), top: pct(to.y - BURST_SIZE / 2, h), width: pct(BURST_SIZE, w) }}>
          <PixelSprite sprite={lightBurst} frame={Math.max(0, frame)} className="h-auto w-full" />
        </div>
      )}
    </div>
  );
}
