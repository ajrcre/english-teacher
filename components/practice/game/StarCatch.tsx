"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { loopStrip, spriteFrames } from "@/components/pixel/spriteCanvas";
import { playDictation, playSfx } from "@/components/sound";
import type { ClientItem } from "@/lib/content/client";
import { approachMs, laneGround } from "@/lib/game/runner";
import {
  decoyLetter,
  isNextLetter,
  nextLetter,
  STAR_RULES,
  starColumns,
  withDecoy,
  starFallMs,
  type SpellKey,
} from "@/lib/game/starCatch";
import { PALETTE } from "@/lib/pixel/palette";
import { backdropFor } from "@/lib/pixel/sprites/backdrops";
import { hatOf } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import { dust, sparkle } from "@/lib/pixel/sprites/runner";
import {
  basket,
  BASKET_H,
  BASKET_W,
  crackedStar,
  fallingStar,
  glowingStar,
  STAR_H,
  STAR_W,
} from "@/lib/pixel/sprites/starCatch";
import { heartEmpty, heartFull, pixelStar } from "@/lib/pixel/sprites/ui";
import { cx } from "@/lib/ui";
import { RichSentence, SpeakerIcon, questionTitle } from "../inputs";
import type { RunnerResult } from "./LaneRunner";

type McqItem = Extract<ClientItem, { type: "mcq" }>;
type SpellItem = Extract<ClientItem, { type: "dictation" }> & {
  spell: SpellKey;
};
export type StarCatchItem = McqItem | SpellItem;

/** Logical pixel size of the game (scaled up crisply). */
const W = 160;
const H = 164;
const SKY = 30;
/** Where Nova stands, where stars land in the snow, and the basket's rim (the catch line). */
const FEET = H - 9;
const GROUND = H - 6;
const RIM = FEET - BASKET_H + 2;
const CATCH_R = 13;
const MOVE = 0.12; // px per ms with the arrows
const DRAG = 0.24; // px per ms towards a dragged/tapped point

type Phase = "play" | "judging" | "won" | "lost" | "done";
type StarState = "fall" | "caught" | "cracked" | "glow" | "landed" | "gone";

interface Star {
  id: number;
  text: string;
  /** Index of the option (choice mode). */
  idx: number;
  x: number;
  y: number;
  startY: number;
  vy: number;
  state: StarState;
  at: number;
}

interface Particle {
  kind: "dust" | "spark";
  x: number;
  y: number;
  born: number;
  vx: number;
  vy: number;
}

/**
 * Carried from one question to the next, so the game flows on: where Nova stands, and a
 * right catch's sparkle and cheer, which play on as the next question's stars appear.
 */
const carry = { x: W / 2, winAt: -1e9, winText: "" };

/**
 * Star Catch. In choice mode the answers fall as stars: move Nova's basket under the right one
 * before it lands in the snow (the catch is sent to the server, which grades it). In spell mode
 * Nova hears a word and catches its letters in order, dodging wrong ones; three wrong letters
 * and the word counts as a mistake. The finished word is sent as a normal dictation answer.
 */
export function StarCatch({
  item,
  unitId,
  hat,
  combo,
  xp,
  pace,
  decoy = null,
  onChoose,
  onFinished,
}: {
  item: StarCatchItem;
  /** A wrong answer from another question, added as a third star when there are only two. */
  decoy?: string | null;
  unitId: string;
  hat?: string | null;
  combo: number;
  xp: number;
  pace: number;
  /** Sends the answer (the caught option, or the spelled word); resolves with the verdict (null on error). */
  onChoose: (answer: string) => Promise<RunnerResult>;
  /** Called once the outcome animation has played. */
  onFinished: (verdict: "correct" | "partial" | "incorrect") => void;
}) {
  const spell = item.type === "dictation";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef(new Map<number, HTMLDivElement>());
  const [tokens, setTokens] = useState<
    { id: number; text: string; falling: boolean }[]
  >([]);
  const [paused, setPaused] = useState(false);
  const [banner, setBanner] = useState<{ text: string; good: boolean } | null>(
    null,
  );
  const [spelled, setSpelled] = useState("");
  const [hearts, setHearts] = useState<number>(STAR_RULES.hearts);
  const [playing, setPlaying] = useState<"word" | "sentence" | null>(null);

  // Mutable state the game loop reads every frame.
  const g = useRef({
    x: W / 2,
    target: null as number | null,
    dir: 0,
    facing: 1,
    moving: false,
    boost: false,
    paused: false,
    phase: "play" as Phase,
    hurtAt: -1e9,
    bumpAt: -1e9,
    at: 0,
    stars: [] as Star[],
    /** Catch a star now (screen-reader buttons and letter keys), by star id. */
    grab: null as number | null,
  });
  const callbacks = useRef({ onChoose, onFinished });
  useEffect(() => {
    callbacks.current = { onChoose, onFinished };
  }, [onChoose, onFinished]);
  const latestItem = useRef(item);
  useEffect(() => {
    latestItem.current = item;
  }, [item]);

  const sprites = useMemo(() => novaSprites(hatOf(hat)), [hat]);
  const optionsKey = item.type === "mcq" ? item.options.join("\u0000") : "";

  const togglePause = () => {
    g.current.paused = !g.current.paused;
    setPaused(g.current.paused);
  };
  /** A mouse or tap click shouldn't leave focus on a control (keyboard focus is kept). */
  const release = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.detail > 0) e.currentTarget.blur();
  };
  const hear = async (part: "word" | "sentence") => {
    if (item.type !== "dictation") return;
    setPlaying(part);
    await playDictation(item.id, item.audioId, part);
    setPlaying(null);
  };

  // Hear the word when a spelling question appears.
  useEffect(() => {
    if (!spell) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void hear("word");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

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
    const s = g.current;
    const N = sprites;
    const parts: Particle[] = [];
    let raf = 0;
    let last = performance.now();
    let nextId = 1;
    let prefix = "";
    let heartsLeft: number = STAR_RULES.hearts;
    let spawnAt = performance.now() + 900;
    let lastXs: number[] = [];
    let missed = 0;
    let respawnAt = 0;
    s.phase = "play";
    s.boost = false;
    s.stars = [];
    s.grab = null;
    s.x = carry.x;
    s.target = null;
    // the last question was caught right: its sparkle and cheer carry over
    let cheer = performance.now() - carry.winAt < 1200 ? carry.winText : "";

    const it = latestItem.current;
    const choices =
      it.type === "mcq" ? withDecoy(it.id, it.options, decoy) : [];
    const key = it.type === "dictation" ? it.spell : null;
    const START_Y = 6;
    const fallPx = RIM - (START_Y + STAR_H);
    const syncTokens = () =>
      setTokens(
        s.stars
          .filter((t) => t.state !== "gone")
          .map((t) => ({
            id: t.id,
            text: t.text,
            falling: t.state === "fall",
          })),
      );

    // ---- choice mode: one star per answer
    let choiceVy = 0;
    const dropChoices = (slower = 1) => {
      if (it.type !== "mcq") return;
      const cols = starColumns(choices.length, W);
      choiceVy = fallPx / starFallMs(approachMs(it, pace)) / slower;
      s.stars = choices.map((o, i) => ({
        id: nextId++,
        text: o,
        idx: i,
        x: cols[i].x,
        y: START_Y + cols[i].dy - 30,
        startY: START_Y + cols[i].dy,
        vy: choiceVy,
        state: "fall",
        at: 0,
      }));
      syncTokens();
    };
    if (!key) dropChoices();

    // ---- spell mode: letters keep falling
    const fallingLetters = () =>
      s.stars.filter((t) => t.state === "fall").map((t) => t.text);
    const spawnLetter = (now: number) => {
      if (!key) return;
      const next = nextLetter(it.id, key, prefix);
      if (!next) return;
      const falling = fallingLetters();
      const needRight = !falling.includes(next);
      const letter =
        needRight && (falling.length > 0 || Math.random() < 0.6)
          ? next
          : decoyLetter(next, falling);
      // a column away from the last few letters, so stars don't stack on each other
      let x = 0;
      for (let tries = 0; tries < 12; tries++) {
        x = 16 + Math.round(Math.random() * (W - 32));
        if (lastXs.every((p) => Math.abs(p - x) > 30)) break;
      }
      lastXs = [x, ...lastXs].slice(0, 2);
      const vy =
        (fallPx / (STAR_RULES.letterFallMs * pace)) * (reduced ? 0.5 : 1);
      s.stars.push({
        id: nextId++,
        text: letter,
        idx: -1,
        x,
        y: -STAR_H,
        startY: -STAR_H,
        vy,
        state: "fall",
        at: now,
      });
      syncTokens();
    };

    const burst = (x: number, y: number, now: number, n = 12) => {
      for (let k = 0; k < n; k++)
        parts.push({
          kind: "spark",
          x,
          y,
          born: now,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.8) * 0.08,
        });
    };

    const finish = (verdict: "correct" | "partial" | "incorrect") => {
      setTimeout(() => {
        s.phase = "done";
        callbacks.current.onFinished(verdict);
      }, 1200);
    };

    /** Sends the answer and plays the outcome. */
    const judge = async (answer: string, caught: Star | null) => {
      s.phase = "judging";
      s.at = performance.now();
      const res = await callbacks.current.onChoose(answer);
      const now = performance.now();
      s.at = now;
      if (!res) {
        // network trouble: let the student try again
        s.phase = "play";
        if (!key) dropChoices();
        else if (caught) caught.state = "gone";
        syncTokens();
        return;
      }
      if (res.verdict === "correct") {
        // Right: straight on to the next question; the cheer plays on there.
        const text = combo + 1 >= 3 ? `${combo + 1} in a row!` : "Correct!";
        s.phase = "done";
        if (caught) caught.state = "gone";
        setBanner({ text, good: true });
        burst(s.x, RIM - 6, now, 18);
        syncTokens();
        carry.x = s.x;
        carry.winAt = now;
        carry.winText = text;
        callbacks.current.onFinished("correct");
      } else {
        s.phase = "lost";
        s.hurtAt = now;
        if (caught) caught.state = "cracked";
        if (!key) {
          const right =
            latestItem.current.type === "mcq"
              ? choices.indexOf(res.modelAnswer)
              : -1;
          for (const t of s.stars)
            if (t.idx === right && t !== caught) t.state = "glow";
        }
        setBanner({ text: "Oops!", good: false });
        finish(res.verdict);
      }
    };

    const catchStar = (t: Star, now: number) => {
      s.bumpAt = now;
      if (!key) {
        t.state = "caught";
        t.at = now;
        playSfx("tap", 0.35);
        void judge(t.text, t);
        return;
      }
      // spelling: the right next letter fills a slot; a wrong one costs a heart
      if (isNextLetter(it.id, key, prefix, t.text)) {
        prefix += t.text;
        setSpelled(prefix);
        t.state = "gone";
        burst(t.x, RIM - 4, now, 8);
        playSfx("tap", 0.4);
        syncTokens();
        if (prefix.length >= key.n) {
          for (const o of s.stars) if (o.state === "fall") o.state = "gone";
          syncTokens();
          void judge(prefix, null);
        }
      } else {
        heartsLeft -= 1;
        setHearts(heartsLeft);
        t.state = "cracked";
        t.at = now;
        s.hurtAt = now;
        playSfx("wrong", 0.25);
        syncTokens();
        if (heartsLeft <= 0) {
          for (const o of s.stars) if (o.state === "fall") o.state = "gone";
          syncTokens();
          void judge(prefix + t.text, t);
        }
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
      const live = !s.paused && s.phase !== "done";
      carry.x = s.x;
      if (cheer) {
        setBanner({ text: cheer, good: true });
        burst(s.x, RIM - 6, now, 16);
        cheer = "";
        setTimeout(() => setBanner((b) => (b?.good ? null : b)), 750);
      }

      if (live) {
        // move Nova
        const before = s.x;
        if (s.phase === "play" || s.phase === "judging") {
          if (s.dir) {
            s.x += s.dir * MOVE * dt;
            s.target = null;
          } else if (s.target !== null) {
            const d = s.target - s.x;
            s.x += Math.sign(d) * Math.min(Math.abs(d), DRAG * dt);
            if (Math.abs(d) < 0.5) s.target = null;
          }
          s.x = Math.max(12, Math.min(W - 12, s.x));
        }
        s.moving = Math.abs(s.x - before) > 0.01;
        if (s.moving) s.facing = s.x > before ? 1 : -1;

        // a screen-reader button or a letter key asked for a star: Nova dashes under it
        if (s.grab !== null && s.phase === "play") {
          const t = s.stars.find((o) => o.id === s.grab && o.state === "fall");
          s.grab = null;
          if (t) {
            s.x = t.x;
            catchStar(t, now);
          }
        }

        // stars fall
        if (s.phase === "play") {
          for (const t of s.stars) {
            if (t.state !== "fall") continue;
            let v = t.vy * (s.boost ? (key ? 3 : 6) : 1);
            if (!key && reduced && !s.boost) v = t.y < t.startY ? t.vy * 8 : 0;
            if (!key && t.y < t.startY) v = Math.max(v, 0.12); // slide into view first
            const was = t.y + STAR_H;
            t.y += v * dt;
            const bottom = t.y + STAR_H;
            if (was < RIM && bottom >= RIM && Math.abs(t.x - s.x) <= CATCH_R) {
              t.y = RIM - STAR_H;
              catchStar(t, now);
              if (s.phase !== "play") break;
            } else if (bottom >= GROUND) {
              t.state = "landed";
              t.at = now;
              parts.push({
                kind: "dust",
                x: t.x - 4,
                y: GROUND - 5,
                born: now,
                vx: 0,
                vy: -0.004,
              });
              syncTokens();
            }
          }
          s.stars = s.stars.filter(
            (t) => t.state !== "landed" || now - t.at < 400,
          );

          if (key) {
            // spelling: keep letters coming
            const falling = s.stars.filter((t) => t.state === "fall").length;
            if (now >= spawnAt && falling < STAR_RULES.lettersAtOnce) {
              spawnLetter(now);
              spawnAt =
                now + STAR_RULES.letterGapMs * pace * (reduced ? 1.6 : 1);
            }
          } else if (!s.stars.some((t) => t.state === "fall")) {
            // every answer landed in the snow: drop them again, a little slower
            if (!respawnAt) {
              respawnAt = now + 700;
              missed += 1;
              setBanner({ text: "Catch one!", good: true });
            } else if (now >= respawnAt) {
              respawnAt = 0;
              s.boost = false;
              setBanner(null);
              dropChoices(1 + missed * 0.25);
            }
          }
        }
      }

      // ---- draw: sky band from the unit's world, then the unit's ground (snow, meadow, floor…)
      ctx.drawImage(strip, 0, 12, W, SKY, 0, 0, W, SKY);
      ctx.fillStyle = col(ground.a);
      ctx.fillRect(0, SKY, W, H - SKY);
      ctx.fillStyle = col(ground.edge);
      ctx.fillRect(0, SKY, W, 1);
      // a soft haze near the horizon, and a few marks on the ground
      ctx.fillStyle = col(ground.b);
      for (let y = SKY + 2; y < SKY + 12; y += 2)
        for (let x = (y / 2) % 4; x < W; x += 4) ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = col(ground.mark);
      for (let k = 0; k < 9; k++)
        ctx.fillRect(
          (k * 37 + 11) % (W - 4),
          SKY + 20 + ((k * 53) % (GROUND - SKY - 30)),
          3,
          1,
        );
      ctx.fillStyle = col(ground.b);
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = col(ground.edge);
      ctx.fillRect(0, GROUND, W, 1);

      // stars, with a dotted trail while they fall
      const elapsed = Math.max(0, now - s.at);
      for (const t of s.stars) {
        if (t.state === "gone") continue;
        let spr = fallingStar;
        let f = frameOf(fallingStar, 5, now + t.id * 170);
        let y = t.y;
        let x = t.x;
        if (t.state === "caught") {
          y = RIM - STAR_H + 7;
          x = s.x;
          if (s.phase === "won") {
            spr = glowingStar;
            y -= Math.min(10, elapsed / 30);
          }
        } else if (t.state === "cracked") {
          spr = crackedStar;
          f = 0;
          y = RIM - STAR_H + 7 + Math.min(6, (now - t.at) / 60);
          x = key ? t.x : s.x;
          if (key && now - t.at > 500) {
            t.state = "gone";
            syncTokens();
            continue;
          }
        } else if (t.state === "glow") {
          spr = glowingStar;
          f = frameOf(glowingStar, 6, now);
        } else if (t.state === "landed") {
          ctx.globalAlpha = Math.max(0, 1 - (now - t.at) / 400);
          y = GROUND - STAR_H + 4;
        }
        if (t.state === "fall" && t.y > -STAR_H + 2) {
          ctx.fillStyle = col(combo >= 3 ? "f" : "y");
          for (const [k, gap] of [
            [0, 4],
            [1, 9],
            [2, 15],
          ])
            if (k < 2 || combo >= 3)
              ctx.fillRect(Math.round(t.x), Math.round(t.y - gap), 1, 2);
        }
        ctx.drawImage(img(spr, f), Math.round(x - STAR_W / 2), Math.round(y));
        ctx.globalAlpha = 1;

        // the label (an answer under the star, or a letter on it)
        const label = labelRefs.current.get(t.id);
        if (label) {
          const ly = key ? y + STAR_H * 0.55 : y + STAR_H + 1;
          label.style.left = `${(x / W) * 100}%`;
          label.style.top = `${(ly / H) * 100}%`;
          label.style.opacity =
            t.state === "landed" ? "0" : y < -STAR_H / 2 ? "0" : "1";
        }
      }

      // Nova behind her basket
      const hurt = now - s.hurtAt < 450 || s.phase === "lost";
      let pose = s.moving ? N.run : N.idle;
      let lift = 0;
      if (hurt) pose = N.hurt;
      else if (s.phase === "won") {
        pose = N.jump;
        lift = -Math.round(Math.abs(Math.sin((elapsed / 380) * Math.PI)) * 5);
      }
      const px = Math.round(s.x - pose.w / 2);
      const py = Math.round(FEET - pose.h + lift);
      const frame = img(pose, frameOf(pose, s.moving ? 14 : 4, now));
      if (s.facing < 0) {
        ctx.save();
        ctx.translate(px + pose.w, py);
        ctx.scale(-1, 1);
        ctx.drawImage(frame, 0, 0);
        ctx.restore();
      } else ctx.drawImage(frame, px, py);
      const squash = now - s.bumpAt < 140 ? 1 : 0;
      ctx.drawImage(
        img(basket, squash),
        Math.round(s.x - BASKET_W / 2),
        FEET - BASKET_H + 1 + lift,
      );

      // dust and sparkles
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k];
        const age = now - p.born;
        const life = p.kind === "dust" ? 420 : 650;
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
      if (s.phase !== "play" || s.paused) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        s.dir = e.key === "ArrowLeft" ? -1 : 1;
        return;
      }
      const onButton =
        e.target instanceof HTMLElement &&
        !!e.target.closest("button, a, select");
      if (
        e.key === "ArrowDown" ||
        ((e.key === "Enter" || e.key === " ") && !onButton)
      ) {
        e.preventDefault();
        s.boost = true;
        return;
      }
      if (!key) {
        // 1–4: run under that answer's star
        const n = Number(e.key);
        const t = Number.isInteger(n)
          ? s.stars.find((o) => o.idx === n - 1 && o.state === "fall")
          : undefined;
        if (t) s.target = t.x;
        return;
      }
      // a letter: run under the lowest falling star with that letter
      if (/^[a-z]$/i.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const ch = e.key.toLowerCase();
        const t = s.stars
          .filter((o) => o.state === "fall" && o.text === ch)
          .sort((a, b) => b.y - a.y)[0];
        if (t) s.target = t.x;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (
        (e.key === "ArrowLeft" && s.dir < 0) ||
        (e.key === "ArrowRight" && s.dir > 0)
      )
        s.dir = 0;
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
        s.boost = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
    // The game restarts only for a new question, new option order, or a new hat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, optionsKey, decoy, unitId, sprites]);

  // Drag (or tap) on the field: Nova runs to that spot.
  const dragging = useRef(false);
  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    g.current.target = ((e.clientX - r.left) / r.width) * W;
  };
  const setDir = (dir: number) => {
    g.current.dir = dir;
  };
  const step = (dir: number) => {
    g.current.target = Math.max(12, Math.min(W - 12, g.current.x + dir * 24));
  };

  const n = item.type === "dictation" ? item.spell.n : 0;

  return (
    <section
      className="mx-auto mt-4 w-full max-w-md font-pixel"
      aria-label="Star catch"
      data-item={item.id}
      data-mode={spell ? "spell" : "choice"}
    >
      <div className="pixel-panel px-4 py-3 text-[#ece4d6]">
        {item.type === "mcq" ? (
          <>
            <p className="text-xs uppercase tracking-widest text-[#a99cc4]">
              {questionTitle(item)}
            </p>
            {item.sentence && (
              <RichSentence
                text={item.sentence}
                className="mt-1 font-sans text-lg leading-snug"
              />
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="flex items-center gap-2 text-lg text-[#ead39b] hover:text-[#f6e7b8] disabled:opacity-60"
                onClick={() => void hear("word")}
                disabled={playing !== null}
              >
                <SpeakerIcon />{" "}
                {playing === "word" ? "Listen…" : "Spell what you hear"}
              </button>
              <button
                type="button"
                className="rounded-full bg-white/5 px-3 py-1 text-sm text-[#a99cc4] hover:bg-white/10 disabled:opacity-60"
                onClick={() => void hear("sentence")}
                disabled={playing !== null}
              >
                {playing === "sentence" ? "Listen…" : "In a sentence"}
              </button>
            </div>
            <p
              className="mt-3 flex flex-wrap justify-center gap-x-2 gap-y-1 text-3xl tracking-wide"
              aria-label={`Spelled so far: ${spelled.split("").join(" ") || "nothing yet"}. ${n} letters.`}
            >
              {Array.from({ length: n }, (_, i) => (
                <span
                  key={i}
                  className={cx(
                    "inline-block w-6 text-center",
                    spelled[i] ? "text-[#c9dfa0]" : "text-[#5a5560]",
                  )}
                >
                  {spelled[i]?.toUpperCase() ?? "_"}
                </span>
              ))}
            </p>
          </>
        )}
      </div>

      {/* The field is square; on short screens it gets narrower so the question stays in view. */}
      <div
        className="mx-auto w-full"
        style={{ maxWidth: "max(15rem, calc(100dvh - 21rem))" }}
      >
        <div className="pixel-panel relative mt-3 overflow-hidden">
          <div className="flex items-center justify-between bg-[#1d1730] px-3 py-1.5 text-[#ead39b]">
            <div
              className="flex min-w-[4.5rem] gap-1"
              aria-label={
                spell
                  ? `${hearts} ${hearts === 1 ? "heart" : "hearts"} left`
                  : undefined
              }
            >
              {spell &&
                Array.from({ length: STAR_RULES.hearts }, (_, i) => (
                  <PixelSprite
                    key={i}
                    sprite={i < hearts ? heartFull : heartEmpty}
                    scale={2}
                  />
                ))}
            </div>
            <span className="text-sm tracking-[0.2em]">STAR CATCH</span>
            <span className="flex min-w-[4.5rem] items-center justify-end gap-1 text-sm">
              <PixelSprite sprite={pixelStar} scale={2} />
              {xp}
              {combo >= 2 && <span className="text-[#a99cc4]">×{combo}</span>}
            </span>
          </div>
          <div className="relative" style={{ aspectRatio: `${W} / ${H}` }}>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="pixelated block h-full w-full touch-none select-none"
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                aim(e);
              }}
              onPointerMove={(e) => dragging.current && aim(e)}
              onPointerUp={() => (dragging.current = false)}
              onPointerCancel={() => (dragging.current = false)}
              aria-hidden="true"
            />
            {tokens.map((t) => (
              <div
                key={t.id}
                ref={(el) => {
                  if (el) labelRefs.current.set(t.id, el);
                  else labelRefs.current.delete(t.id);
                }}
                className={cx(
                  "pointer-events-none absolute -translate-x-1/2 whitespace-nowrap leading-none",
                  spell
                    ? "-translate-y-1/2 text-xl text-[#241c2b] sm:text-2xl"
                    : "bg-[#ead39b] px-1.5 py-1 text-[13px] text-[#241c2b] shadow-[0_0_0_2px_#241c2b] sm:text-[15px]",
                )}
                style={{ left: "50%", top: "-20%", opacity: 0 }}
              >
                {t.text}
              </div>
            ))}
            <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[11px] text-[#cf9c55]/70">
              ◀ drag Nova or use the arrows ▶
            </p>
            {banner && (
              <div
                className={cx(
                  "pointer-events-none absolute inset-x-0 top-[24%] text-center text-2xl [text-shadow:2px_2px_0_#241c2b] sm:text-3xl",
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
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <MoveButton
            dir={-1}
            label="Move left"
            onHold={setDir}
            onStep={step}
          />
          <button
            type="button"
            className="pixel-btn min-w-[6.5rem]"
            aria-label="Drop the stars faster"
            onPointerDown={() => (g.current.boost = true)}
            onPointerUp={() => (g.current.boost = false)}
            onPointerLeave={() => (g.current.boost = false)}
            onClick={(e) => {
              release(e);
              if (e.detail === 0) {
                g.current.boost = true;
                setTimeout(() => (g.current.boost = false), 600);
              }
            }}
          >
            DROP ▼
          </button>
          <MoveButton
            dir={1}
            label="Move right"
            onHold={setDir}
            onStep={step}
          />
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
      </div>

      <div className="pixel-panel mt-3 flex items-start gap-3 px-4 py-3 text-[#ece4d6]">
        <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#cf9c55]">
          <PixelSprite sprite={pixelStar} scale={3} />
        </span>
        <div>
          <p className="text-[#ead39b]">
            {spell ? "Star Catcher: spelling" : "Star Catcher"}
          </p>
          <p className="mt-0.5 text-sm text-[#cdbfa8]">
            {spell
              ? "Letters fall from the sky. Catch the next letter of the word, and dodge the wrong ones! (Or type the letter.)"
              : `The answers fall as stars. Move Nova's basket to catch the right star before it hits the ground! (Keys 1–${item.type === "mcq" ? item.options.length + (decoy && item.options.length < 3 ? 1 : 0) : 4} run to a star.)`}
          </p>
        </div>
      </div>

      {/* Screen readers: catch a star directly */}
      <div className="sr-only">
        {tokens
          .filter((t) => t.falling)
          .map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => (g.current.grab = t.id)}
            >
              {spell ? `Catch letter ${t.text}` : `Catch the star: ${t.text}`}
            </button>
          ))}
      </div>
    </section>
  );
}

/** Hold to keep Nova running that way; a keyboard press takes one step. */
function MoveButton({
  dir,
  label,
  onHold,
  onStep,
}: {
  dir: number;
  label: string;
  onHold: (dir: number) => void;
  onStep: (dir: number) => void;
}) {
  return (
    <button
      type="button"
      className="pixel-btn pixel-btn-ghost w-14 touch-none"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onHold(dir);
      }}
      onPointerUp={() => onHold(0)}
      onPointerLeave={() => onHold(0)}
      onPointerCancel={() => onHold(0)}
      onClick={(e) => {
        if (e.detail > 0) e.currentTarget.blur();
        else onStep(dir);
      }}
    >
      {dir < 0 ? "◀" : "▶"}
    </button>
  );
}
