"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loopStrip, spriteFrames } from "@/components/pixel/spriteCanvas";
import { playSfx } from "@/components/sound";
import type { ClientItem } from "@/lib/content/client";
import { approachMs, laneFromKey, laneGround } from "@/lib/game/runner";
import { PALETTE } from "@/lib/pixel/palette";
import { backdropFor } from "@/lib/pixel/sprites/backdrops";
import { hatOf } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import {
  dust,
  gateBurst,
  gateCracked,
  gateGlow,
  gateIdle,
  sparkle,
} from "@/lib/pixel/sprites/runner";
import { cx } from "@/lib/ui";
import { RichSentence, questionTitle } from "../inputs";

export type RunnerResult = {
  verdict: "correct" | "partial" | "incorrect";
  modelAnswer: string;
} | null;

type McqItem = Extract<ClientItem, { type: "mcq" }>;

/** Logical pixel size of the game (scaled up crisply to the screen width). */
const W = 160;
const SKY = 40;
const LANE_H = 28;
const BAND_TOP = 16;
const NOVA_X = 16;
const CONTACT_X = NOVA_X + 13;
const GATE_H = 26;

type Phase = "run" | "judging" | "won" | "lost" | "done";

interface Particle {
  kind: "dust" | "spark";
  x: number;
  y: number;
  born: number;
  vx: number;
  vy: number;
}

/**
 * Carried from one question to the next, so Nova keeps running instead of starting over:
 * how far the world has scrolled, and her lane.
 */
const carry = { scroll: 0, lane: -1, at: -1e9 };
const carried = (lanes: number) =>
  performance.now() - carry.at < 4000 && carry.lane >= 0 && carry.lane < lanes;

/**
 * The lane-runner: Nova runs on the unit's ground while the answer gates rush towards her.
 * Steer her into the lane of the right answer before she reaches them. The choice is sent
 * to the server as a normal answer; the gates burst open or crack depending on its verdict.
 */
export function LaneRunner({
  item,
  unitId,
  hat,
  combo,
  pace,
  onChoose,
  onFinished,
}: {
  item: McqItem;
  unitId: string;
  hat?: string | null;
  combo: number;
  pace: number;
  /** Sends the chosen option as the answer; resolves with the server's verdict (null on error). */
  onChoose: (choice: string) => Promise<RunnerResult>;
  /** Called once the outcome animation has played. */
  onFinished: (verdict: "correct" | "partial" | "incorrect") => void;
}) {
  const lanes = item.options.length;
  const H = SKY + lanes * LANE_H + 4;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [lane, setLane] = useState(() =>
    carried(lanes) ? carry.lane : Math.floor((lanes - 1) / 2),
  );
  const [paused, setPaused] = useState(false);
  const [banner, setBanner] = useState<{ text: string; good: boolean } | null>(
    null,
  );

  // Mutable game state the loop reads every frame.
  const g = useRef({
    lane,
    laneY: lane,
    boost: false,
    paused: false,
    phase: "run" as Phase,
    chosen: -1,
    correct: -1,
    at: 0,
  });
  const callbacks = useRef({ onChoose, onFinished });
  useEffect(() => {
    callbacks.current = { onChoose, onFinished };
  }, [onChoose, onFinished]);
  // The answer sent must be the label on the gate the student sees, even if the question's
  // options were re-ordered after the game started (e.g. a round reloaded): read the latest.
  const latestItem = useRef(item);
  useEffect(() => {
    latestItem.current = item;
  }, [item]);

  const steer = (to: number) => {
    const s = g.current;
    if (s.phase !== "run") return;
    const next = Math.max(0, Math.min(lanes - 1, to));
    if (next !== s.lane) playSfx("tap", 0.2);
    s.lane = next;
    setLane(next);
  };
  const go = () => {
    if (g.current.phase === "run") g.current.boost = true;
  };
  /** A mouse or tap click shouldn't leave focus on a control (keyboard focus is kept). */
  const release = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail > 0) e.currentTarget.blur();
  };
  const togglePause = () => {
    g.current.paused = !g.current.paused;
    setPaused(g.current.paused);
  };

  const sprites = useMemo(() => novaSprites(hatOf(hat)), [hat]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const strip = loopStrip(backdropFor(unitId));
    const ground = laneGround(unitId);
    const col = (ch: string) => PALETTE[ch] ?? "#000";
    const startX = W + 4;
    const total = approachMs(item, pace);
    const speed = (startX - CONTACT_X) / total; // px per ms
    let gx = reduced ? W * 0.62 : startX;
    // keep the world where the last question left it, so the run flows on
    let scroll = performance.now() - carry.at < 4000 ? carry.scroll : 0;
    let last = performance.now();
    let dustAt = 0;
    const parts: Particle[] = [];
    const s = g.current;
    s.phase = "run";
    s.boost = false;
    s.chosen = -1;
    s.correct = -1;
    const laneTop = (i: number) => SKY + i * LANE_H;
    const N = sprites;
    let raf = 0;

    const judge = async () => {
      s.phase = "judging";
      s.chosen = s.lane;
      s.at = performance.now();
      const choice = latestItem.current.options[s.chosen];
      const res = await callbacks.current.onChoose(choice);
      if (!res) {
        // network trouble: put the gates back so the student can try again
        s.phase = "run";
        s.boost = false;
        gx = startX * 0.7;
        return;
      }
      s.at = performance.now();
      if (res.verdict === "correct") {
        s.phase = "won";
        setBanner({
          text: combo + 1 >= 3 ? `${combo + 1} in a row!` : "Correct!",
          good: true,
        });
        for (let k = 0; k < 14; k++)
          parts.push({
            kind: "spark",
            x: gx + 9,
            y: laneTop(s.chosen) + 10,
            born: s.at,
            vx: (Math.random() - 0.3) * 0.08,
            vy: (Math.random() - 0.5) * 0.08,
          });
        setTimeout(() => {
          s.phase = "done";
          callbacks.current.onFinished("correct");
        }, 520); // just the leap through the gate, then straight on to the next gates
      } else {
        s.phase = "lost";
        s.correct = latestItem.current.options.indexOf(res.modelAnswer);
        setBanner({ text: "Oops!", good: false });
        setTimeout(() => callbacks.current.onFinished(res.verdict), 1100);
      }
    };

    const frameOf = (spr: { frames: unknown[] }, fps: number, t: number) =>
      Math.floor((Math.max(0, t) * fps) / 1000) % spr.frames.length;
    /** A sprite frame, with the index clamped so a timing hiccup can never stop the loop. */
    const img = (spr: Parameters<typeof spriteFrames>[0], f: number) => {
      const frames = spriteFrames(spr);
      return frames[
        Math.max(0, Math.min(frames.length - 1, Math.floor(f) || 0))
      ];
    };

    const draw = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      carry.scroll = scroll;
      carry.lane = s.lane;
      carry.at = now;
      if (!s.paused) {
        let v = speed * (s.boost ? 6 : 1);
        if (reduced && s.phase === "run") v = s.boost ? speed * 6 : 0;
        if (s.phase === "judging") v = speed * 0.12;
        if (s.phase === "lost" || s.phase === "done")
          v = s.phase === "done" ? speed * 2 : 0;
        if (s.phase === "won") v = speed * 3;
        gx -= v * dt;
        scroll += Math.max(v, s.phase === "lost" ? 0 : speed * 0.6) * dt;
        s.laneY += (s.lane - s.laneY) * Math.min(1, dt / 70);
        if (s.phase === "run" && gx <= CONTACT_X) void judge();
      }

      // sky band: the unit's world, scrolling slowly (parallax)
      const sx = (scroll * 0.25) % strip.width;
      ctx.drawImage(
        strip,
        sx,
        BAND_TOP,
        Math.min(W, strip.width - sx),
        SKY,
        0,
        0,
        Math.min(W, strip.width - sx),
        SKY,
      );
      if (strip.width - sx < W)
        ctx.drawImage(
          strip,
          0,
          BAND_TOP,
          W - (strip.width - sx),
          SKY,
          strip.width - sx,
          0,
          W - (strip.width - sx),
          SKY,
        );

      // lanes
      for (let i = 0; i < lanes; i++) {
        const y = laneTop(i);
        ctx.fillStyle = col(i % 2 ? ground.b : ground.a);
        ctx.fillRect(0, y, W, LANE_H);
        ctx.fillStyle = col(ground.edge);
        ctx.fillRect(0, y, W, 1);
        ctx.fillStyle = col(ground.mark);
        for (let x = -((scroll % 16) + 16); x < W; x += 16)
          ctx.fillRect(Math.round(x), y + LANE_H / 2, 6, 1);
      }
      ctx.fillStyle = col(ground.edge);
      ctx.fillRect(0, SKY + lanes * LANE_H, W, 4);
      // highlight Nova's lane faintly
      ctx.fillStyle = "rgba(246,231,184,0.10)";
      ctx.fillRect(0, laneTop(s.lane) + 1, W, LANE_H - 1);

      // speed lines on a streak or a boost
      if ((combo >= 3 || s.boost) && s.phase !== "lost") {
        ctx.fillStyle = col("w");
        for (let k = 0; k < 6; k++) {
          const lx = W - ((now * 0.25 + k * 53) % (W + 30));
          ctx.fillRect(
            Math.round(lx),
            SKY + ((k * 37) % (lanes * LANE_H)),
            8,
            1,
          );
        }
      }

      // gates
      // rAF's timestamp can be a moment older than the verdict's: never negative
      const elapsed = Math.max(0, now - s.at);
      for (let i = 0; i < lanes; i++) {
        let spr = gateIdle;
        let f = frameOf(gateIdle, 6, now);
        if (s.phase === "won" || s.phase === "done") {
          if (i === s.chosen) {
            spr = gateBurst;
            f = Math.min(2, Math.floor(elapsed / 110));
          }
        } else if (s.phase === "lost") {
          if (i === s.chosen) spr = gateCracked;
          else if (i === s.correct) spr = gateGlow;
          f = spr === gateCracked ? 0 : frameOf(spr, 6, now);
        }
        const gy = laneTop(i) + LANE_H - GATE_H + 2;
        ctx.drawImage(img(spr, f), Math.round(gx), gy);
        const label = labelRefs.current[i];
        if (label) {
          // keep the label on screen while its gate slides in from the edge
          label.style.left = `${Math.min(86, Math.max(10, ((gx + 9) / W) * 100))}%`;
          label.style.top = `${((gy - 1) / H) * 100}%`;
          label.style.opacity = gx > W - 2 ? "0" : "1";
        }
      }

      // Nova
      let pose = combo >= 3 || s.boost ? N.sprint : N.run;
      let fps = combo >= 3 || s.boost ? 16 : 12;
      let lift = 0;
      if (s.phase === "lost") {
        pose = elapsed < 220 ? N.trip : elapsed < 700 ? N.roll : N.dazed;
        fps = pose === N.roll ? 10 : 3;
      } else if (s.phase === "won" || s.phase === "done") {
        pose = elapsed < 520 ? N.leap : N.sprint;
        lift =
          elapsed < 520
            ? -Math.round(Math.sin((elapsed / 520) * Math.PI) * 6)
            : 0;
      } else if (Math.abs(s.lane - s.laneY) > 0.15) {
        pose = s.lane < s.laneY ? N.hopUp : N.hopDown;
      }
      const ny = Math.round(
        laneTop(0) + s.laneY * LANE_H + LANE_H - pose.h + 1 + lift,
      );
      const nx =
        s.phase === "lost" ? NOVA_X + Math.min(8, elapsed / 60) : NOVA_X;
      ctx.drawImage(img(pose, frameOf(pose, fps, now)), Math.round(nx), ny);

      // dust and sparkles
      if (!s.paused && s.phase !== "lost" && now > dustAt) {
        dustAt = now + (combo >= 3 ? 120 : 200);
        parts.push({
          kind: "dust",
          x: NOVA_X + 2,
          y: ny + pose.h - 6,
          born: now,
          vx: -0.04,
          vy: -0.004,
        });
        if (combo >= 3)
          parts.push({
            kind: "spark",
            x: NOVA_X + 1,
            y: ny + 8 + Math.random() * 6,
            born: now,
            vx: -0.06,
            vy: 0,
          });
      }
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k];
        const age = now - p.born;
        const life = p.kind === "dust" ? 420 : 600;
        if (age > life) {
          parts.splice(k, 1);
          continue;
        }
        const spr = p.kind === "dust" ? dust : sparkle;
        const fr = Math.min(
          spr.frames.length - 1,
          Math.floor((age / life) * spr.frames.length),
        );
        ctx.drawImage(
          img(spr, fr),
          Math.round(p.x + p.vx * age),
          Math.round(p.y + p.vy * age),
        );
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "p" || e.key === "P" || e.key === "Escape") {
        togglePause();
        return;
      }
      if (s.phase !== "run" || s.paused) return;
      const to = laneFromKey(e.key, s.lane, lanes);
      if (to !== null) {
        e.preventDefault();
        steer(to);
        return;
      }
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        // On a focused button, Enter/Space belong to that button (it would also "click" it).
        if (
          (e.key === "Enter" || e.key === " ") &&
          e.target instanceof HTMLElement &&
          e.target.closest("button, a, select")
        )
          return;
        e.preventDefault();
        go();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
    // The game restarts only for a new question, new option order, or a new hat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.options.join("\u0000"), unitId, sprites]);

  // Touch: swipe up/down to change lane, or tap a lane.
  const touch = useRef<{ y: number; t: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    touch.current = { y: e.clientY, t: performance.now() };
  };
  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dy = e.clientY - start.y;
    if (Math.abs(dy) > 22) {
      steer(g.current.lane + (dy > 0 ? 1 : -1));
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const ly = ((e.clientY - r.top) / r.height) * H - SKY;
    if (ly >= 0) steer(Math.floor(ly / LANE_H));
  };

  return (
    <section
      className="mt-4 font-pixel"
      aria-label="Answer runner"
      data-item={item.id}
      data-lane={lane}
    >
      <div className="pixel-panel px-4 py-3 text-[#ece4d6]">
        <p className="text-xs uppercase tracking-widest text-[#a99cc4]">
          {questionTitle(item)}
        </p>
        {item.sentence && (
          <RichSentence
            text={item.sentence}
            className="mt-1 font-sans text-lg leading-snug"
          />
        )}
      </div>

      <div
        className="pixel-panel relative mt-3 overflow-hidden"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="pixelated block h-full w-full touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          aria-hidden="true"
        />
        {item.options.map((o, i) => (
          <div
            key={o}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className={cx(
              "pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap px-1.5 py-0.5 text-[13px] leading-tight shadow-[0_0_0_2px_#241c2b] sm:text-base",
              i === lane
                ? "bg-[#ead39b] text-[#241c2b]"
                : "bg-[#ddd1bd] text-[#241c2b]",
            )}
            style={{ left: "110%", top: "0%" }}
          >
            {o}
          </div>
        ))}
        {combo >= 2 && (
          <span className="absolute right-2 top-1 text-sm text-[#ead39b] [text-shadow:1px_1px_0_#241c2b]">
            ×{combo}
          </span>
        )}
        {banner && (
          <div
            className={cx(
              "pointer-events-none absolute inset-x-0 top-[18%] text-center text-2xl [text-shadow:2px_2px_0_#241c2b] sm:text-3xl",
              banner.good ? "text-[#f6e7b8]" : "text-[#cf9f9b]",
            )}
            role="status"
          >
            {banner.text}
          </div>
        )}
        {paused && (
          <div
            className="absolute inset-0 grid place-items-center bg-[#0d1a2bcc] text-2xl text-[#ead39b]"
            role="status"
          >
            Paused
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          className="pixel-btn pixel-btn-ghost w-14"
          onClick={(e) => {
            release(e);
            steer(g.current.lane - 1);
          }}
          aria-label="Move up a lane"
        >
          ▲
        </button>
        <button
          type="button"
          className="pixel-btn min-w-[7rem]"
          onClick={(e) => {
            release(e);
            go();
          }}
          aria-label="Run now"
        >
          GO ▶▶
        </button>
        <button
          type="button"
          className="pixel-btn pixel-btn-ghost w-14"
          onClick={(e) => {
            release(e);
            steer(g.current.lane + 1);
          }}
          aria-label="Move down a lane"
        >
          ▼
        </button>
        <button
          type="button"
          className="pixel-btn pixel-btn-ghost w-14"
          onClick={(e) => {
            release(e);
            togglePause();
          }}
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused ? "▶" : "❚❚"}
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-[#a99cc4]">
        Steer into the right gate: ▲▼, swipe, tap a lane or keys 1–{lanes} · GO
        to run now
      </p>

      {/* Screen readers: the gates as plain buttons */}
      <div className="sr-only">
        {item.options.map((o, i) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              steer(i);
              go();
            }}
          >
            Run through gate {i + 1}: {o}
          </button>
        ))}
      </div>
    </section>
  );
}
