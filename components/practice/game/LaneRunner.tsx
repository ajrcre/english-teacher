"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loopStrip, spriteFrames } from "@/components/pixel/spriteCanvas";
import { playSfx } from "@/components/sound";
import type { ClientItem } from "@/lib/content/client";
import {
  approachMs,
  easeScenery,
  laneAt,
  laneFromKey,
  laneGround,
  runnerLayout,
  RUNNER_FIELD,
  SCENERY,
} from "@/lib/game/runner";
import { fieldHeight, isControl, toField } from "@/lib/game/stage";
import { PALETTE } from "@/lib/pixel/palette";
import { backdropFor } from "@/lib/pixel/sprites/backdrops";
import { hatOf } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import {
  foreScenery,
  groundDetails,
  midScenery,
} from "@/lib/pixel/sprites/scenery";
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
import { useField } from "./useField";

export type RunnerResult = {
  verdict: "correct" | "partial" | "incorrect";
  modelAnswer: string;
} | null;

type McqItem = Extract<ClientItem, { type: "mcq" }>;

/**
 * Logical width of the game (scaled up crisply to fill the screen). The height, the sky band and
 * the lanes are fitted to the screen when a question starts (see runnerLayout).
 */
const W = 160;
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
 * how far the ground and the scenery have scrolled, how fast the scenery moves, and her lane.
 */
const carry = { scroll: 0, world: 0, fast: 1, lane: -1, at: -1e9 };
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
  const { areaRef, field, box } = useField(W, (area) =>
    runnerLayout(
      fieldHeight(
        area,
        W,
        0,
        RUNNER_FIELD.maxSky +
          lanes * RUNNER_FIELD.maxLaneH +
          RUNNER_FIELD.floor,
      ),
      lanes,
    ),
  );
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
    if (!canvas || !ctx || !field) return;
    const { sky: SKY, laneH: LANE_H, h: H } = field;
    ctx.imageSmoothingEnabled = false;
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const strip = loopStrip(backdropFor(unitId));
    const mid = spriteFrames(midScenery(unitId))[0];
    const fore = spriteFrames(foreScenery(unitId))[0];
    const details = spriteFrames(groundDetails(unitId, LANE_H))[0];
    const ground = laneGround(unitId);
    const col = (ch: string) => PALETTE[ch] ?? "#000";
    const startX = W + 4;
    const total = approachMs(item, pace);
    const speed = (startX - CONTACT_X) / total; // px per ms
    let gx = reduced ? W * 0.62 : startX;
    // keep the world where the last question left it, so the run flows on
    const flowing = performance.now() - carry.at < 4000;
    let scroll = flowing ? carry.scroll : 0;
    // the scenery's own distance, and its speed-up on a streak (ground and gates keep their pace)
    let world = flowing ? carry.world : 0;
    let fast = flowing ? carry.fast : 1;
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

    /** Repeats a seamless tile across the field, scrolled left by `offset`. */
    const tile = (img: HTMLCanvasElement, offset: number, y: number) => {
      const w = img.width;
      for (let x = -(((offset % w) + w) % w); x < W; x += w)
        ctx.drawImage(img, Math.round(x), y);
    };

    const draw = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      carry.scroll = scroll;
      carry.world = world;
      carry.fast = fast;
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
        const step = Math.max(v, s.phase === "lost" ? 0 : speed * 0.6) * dt;
        fast = easeScenery(
          fast,
          combo >= SCENERY.streakAt && s.phase !== "lost",
          dt,
        );
        scroll += step;
        world += step * fast;
        s.laneY += (s.lane - s.laneY) * Math.min(1, dt / 70);
        if (s.phase === "run" && gx <= CONTACT_X) void judge();
      }

      // sky band: the unit's world, scrolling slowly (parallax)
      const sx = (world * SCENERY.sky) % strip.width;
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

      // on a streak the sky glows warm, like a sprint into the sunset
      if (fast > 1.01) {
        ctx.globalAlpha =
          SCENERY.glow * Math.min(1, (fast - 1) / (SCENERY.streak - 1));
        ctx.fillStyle = col("7");
        ctx.fillRect(0, 0, W, SKY);
        ctx.globalAlpha = 1;
      }
      // things standing behind the lanes, passing by faster than the sky
      tile(mid, world * SCENERY.mid, SKY - mid.height);

      // lanes, with pebbles and flowers moving with the gates
      for (let i = 0; i < lanes; i++) {
        const y = laneTop(i);
        ctx.fillStyle = col(i % 2 ? ground.b : ground.a);
        ctx.fillRect(0, y, W, LANE_H);
        tile(details, scroll + i * 37, y);
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
        // a soft shadow at the gate's feet grounds it in its lane
        ctx.fillStyle = col("k");
        ctx.globalAlpha = 0.22;
        ctx.fillRect(Math.round(gx) - 1, gy + GATE_H - 2, 20, 2);
        ctx.globalAlpha = 1;
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
      // her shadow stays on the ground (smaller while she's in the air)
      const footY = Math.round(laneTop(0) + s.laneY * LANE_H + LANE_H - 1);
      const sw = lift < -2 ? 10 : 14;
      ctx.fillStyle = col("k");
      ctx.globalAlpha = 0.25;
      ctx.fillRect(Math.round(nx) + 12 - sw / 2, footY, sw, 2);
      ctx.globalAlpha = 1;
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

      // tufts at the very front rush past fastest
      tile(fore, world * SCENERY.fore, H - fore.height);

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
  }, [item.id, item.options.join("\u0000"), unitId, sprites, field]);

  // Touch or mouse, anywhere on the game (not on its buttons): Nova runs to the lane at that
  // height, and follows a finger dragged up and down. Above the lanes is the top lane, below
  // them the bottom one. A tap while paused carries on.
  const steering = useRef(false);
  const steerAt = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !field) return;
    const p = toField(
      e.clientX,
      e.clientY,
      canvas.getBoundingClientRect(),
      W,
      field.h,
    );
    steer(laneAt(p.y, field.sky, field.laneH, lanes));
  };
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (isControl(e.target)) return;
    if (g.current.paused) {
      togglePause();
      return;
    }
    steering.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    steerAt(e);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (steering.current) steerAt(e);
  };
  const stopSteering = () => {
    steering.current = false;
  };

  return (
    <section
      className="mt-2 flex min-h-0 flex-1 touch-none select-none flex-col font-pixel"
      aria-label="Answer runner"
      data-item={item.id}
      data-lane={lane}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopSteering}
      onPointerCancel={stopSteering}
    >
      <div className="pixel-panel px-4 py-3 text-[#ece4d6]" data-no-steer>
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
        className="pixel-panel relative mt-2 min-h-[9rem] flex-1 overflow-hidden"
        style={{ background: PALETTE[laneGround(unitId).edge] }}
      >
        <div ref={areaRef} className="absolute inset-0">
          {field && box && (
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: box.w, height: box.h }}
              data-field
            >
              <canvas
                ref={canvasRef}
                width={W}
                height={field.h}
                className="pixelated block h-full w-full"
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
            </div>
          )}
        </div>
        {paused && (
          <div
            className="absolute inset-0 grid place-items-center bg-[#0d1a2bcc] text-2xl text-[#ead39b]"
            role="status"
          >
            Paused
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
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
      <p className="mt-1.5 text-center text-xs text-[#a99cc4]">
        Tap or drag to a lane · GO to run now
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
