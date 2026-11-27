"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { loopStrip, spriteFrames } from "@/components/pixel/spriteCanvas";
import { playDictation, playSfx } from "@/components/sound";
import type { ClientItem, ItemResponse } from "@/lib/content/client";
import { approachMs, laneGround } from "@/lib/game/runner";
import { fieldHeight, isControl, toField } from "@/lib/game/stage";
import { bubbleShatter, foxThrow } from "@/components/foxSounds";
import {
  catcherX,
  decoyLetter,
  arcPoint,
  FOX_STAR_RULES,
  foxGreyX,
  foxSide,
  foxThrowStage,
  GREY_STAR,
  fillMask,
  isNextLetter,
  isPair,
  nextLetter,
  STAR_RULES,
  starColumns,
  withDecoy,
  starFallMs,
  type MatchKey,
  type SpellKey,
} from "@/lib/game/starCatch";
import { PALETTE } from "@/lib/pixel/palette";
import { backdropFor } from "@/lib/pixel/sprites/backdrops";
import {
  FOX_H,
  FOX_W,
  GREY_FOX,
  THROW_PAW,
} from "@/lib/pixel/sprites/greyFox";
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
  greyStar,
  shard,
  STAR_H,
  STAR_W,
} from "@/lib/pixel/sprites/starCatch";
import { heartEmpty, heartFull, pixelStar } from "@/lib/pixel/sprites/ui";
import { cx } from "@/lib/ui";
import { RichSentence, SpeakerIcon, questionTitle } from "../inputs";
import type { RunnerResult } from "./LaneRunner";
import { useField } from "./useField";

type McqItem = Extract<ClientItem, { type: "mcq" }>;
type SpellItem = Extract<ClientItem, { type: "dictation" | "typed" }> & {
  spell: SpellKey;
};
type MatchItem = Extract<ClientItem, { type: "match" }> & { pairKey: MatchKey };
export type StarCatchItem = McqItem | SpellItem | MatchItem;

/** Shuffles a copy of a list. */
function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Logical width of the game (scaled up crisply). Its height is fitted to the screen when a
 * question starts: square at the least, and taller on a phone held upright.
 */
const W = 160;
const MIN_H = 164;
const MAX_H = 260;
const SKY = 30;
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
  /** The Grey Fox's game: the star trembles at the top until then, then drops. */
  holdUntil?: number;
  /** The Grey Fox's game: a grey star, which must not be caught. */
  grey?: boolean;
  /** A grey star he threw: it flies in an arc from his paw to its landing spot (game clock ms). */
  arc?: { from: { x: number; y: number }; to: { x: number; y: number }; at: number };
}

/** The Grey Fox's throw in progress: when he started (game clock ms), where it lands, which side. */
interface FoxThrow {
  at: number;
  toX: number;
  side: 1 | -1;
  launched: boolean;
}

interface Particle {
  kind: "dust" | "spark" | "ring" | "shard";
  x: number;
  y: number;
  born: number;
  vx: number;
  vy: number;
  /** Shards: which shape. */
  f?: number;
}

/**
 * Carried from one question to the next, so the game flows on: where Nova stands, and a
 * right catch's sparkle and cheer, which play on as the next question's stars appear.
 */
const carry = { x: W / 2, winAt: -1e9, winText: "" };
/** Tests: ?foxGrey drops one grey star right above Nova, once per page load. */
let foxGreyAsked = false;

/**
 * Star Catch.
 * - choice: the answers fall as stars; move Nova's basket under the right one before it lands
 *   (the catch is sent to the server, which grades it).
 * - spell: Nova hears a word (or reads a clue) and catches its letters in order, dodging wrong
 *   ones; three wrong letters and it counts as a mistake. The finished word is sent as a
 *   normal dictation / typed answer.
 * - match: a definition is shown and its word falls among two others; catch it, and the next
 *   definition comes. Three wrong catches and the matching is sent as it stands.
 */
export function StarCatch({
  item,
  unitId,
  hat,
  combo,
  xp,
  pace,
  decoy = null,
  variant,
  foxHearts,
  onChoose,
  onFinished,
}: {
  item: StarCatchItem;
  /** "fox": the Grey Fox's version (trembling stars, grey stars); its question is in his bubble. */
  variant?: "fox";
  /** The Grey Fox's game: Nova's hearts in his battle, shown in the bar above the field. */
  foxHearts?: { left: number; of: number };
  /** A wrong answer from another question, added as a third star when there are only two. */
  decoy?: string | null;
  unitId: string;
  hat?: string | null;
  combo: number;
  xp: number;
  pace: number;
  /** Sends the answer; resolves with the verdict (null on error). */
  onChoose: (response: ItemResponse) => Promise<RunnerResult>;
  /** Called once the outcome animation has played. */
  onFinished: (verdict: "correct" | "partial" | "incorrect") => void;
}) {
  const mode: "choice" | "spell" | "match" =
    item.type === "mcq" ? "choice" : item.type === "match" ? "match" : "spell";
  const spell = mode === "spell";
  const fox = variant === "fox" && mode === "choice";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const { areaRef, field, box } = useField(W, (area) => ({
    h: fieldHeight(area, W, MIN_H, MAX_H),
  }));
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
  /** Matching: the definition to find a word for, and how many pairs are done. */
  const [clue, setClue] = useState<{
    text: string;
    at: number;
    of: number;
  } | null>(null);

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
  const optionsKey =
    item.type === "mcq"
      ? item.options.join("\u0000")
      : item.type === "match"
        ? [...item.left, ...item.right].join("\u0000")
        : "";

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
    if (item.type !== "dictation") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void hear("word");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !field) return;
    const H = field.h;
    /** Where Nova stands, where stars land in the snow, and the basket's rim (the catch line). */
    const FEET = H - 9;
    const GROUND = H - 6;
    const RIM = FEET - BASKET_H + 3;
    /** The Grey Fox stands on the ground at the side of the field, mostly in view. */
    const FOX_Y = GROUND - FOX_H + 1;
    const foxX = (side: 1 | -1, out = 0) =>
      side > 0
        ? Math.round(W - FOX_W + 4 + out * (FOX_W - 2))
        : Math.round(-4 - out * (FOX_W - 2));
    /** Where a grey star leaves his paw (the top-left of the star). */
    const foxPaw = (side: 1 | -1) => {
      const px = side > 0 ? THROW_PAW.x : FOX_W - 1 - THROW_PAW.x;
      return {
        x: foxX(side) + px,
        y: FOX_Y + THROW_PAW.y - STAR_H / 2,
      };
    };
    const section = sectionRef.current;
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
    // The Grey Fox's grey stars: the first comes after a moment. (Tests can ask for one right
    // above Nova with ?foxGrey.)
    let greyHere =
      fox &&
      !foxGreyAsked &&
      new URLSearchParams(window.location.search).has("foxGrey");
    /**
     * A clock that stops while the game is paused: the Grey Fox's throws run on it, so a pause
     * holds him (and his star) in place.
     */
    let clock = 0;
    let greyAt = greyHere ? 900 : 1500;
    let thr: FoxThrow | null = null;
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
    const key =
      it.type === "dictation" || it.type === "typed" ? it.spell : null;
    const mk = it.type === "match" ? it.pairKey : null;
    /** Modes where a wrong catch costs a heart and the game goes on. */
    const goesOn = !!key || !!mk;
    const START_Y = 6;
    const fallPx = RIM - (START_Y + STAR_H);
    const syncTokens = () =>
      setTokens(
        s.stars
          .filter((t) => t.state !== "gone" && !t.grey)
          .map((t) => ({
            id: t.id,
            text: t.text,
            falling: t.state === "fall",
          })),
      );

    // ---- choice mode: one star per answer
    let choiceVy = 0;
    const dropStars = (labels: string[], reading: number, slower = 1) => {
      const cols = starColumns(labels.length, W);
      choiceVy = fox
        ? fallPx / FOX_STAR_RULES.dropMs
        : fallPx / starFallMs(reading) / slower;
      const holdUntil = fox
        ? performance.now() + 500 + starFallMs(reading) * slower
        : undefined;
      s.stars = labels.map((o, i) => ({
        id: nextId++,
        text: o,
        idx: i,
        x: cols[i].x,
        y: START_Y + cols[i].dy - 30,
        startY: START_Y + cols[i].dy,
        vy: choiceVy,
        state: "fall",
        at: 0,
        holdUntil,
      }));
      syncTokens();
    };
    const dropChoices = (slower = 1) => {
      if (it.type === "mcq") dropStars(choices, approachMs(it, pace), slower);
      else dropWave(slower);
    };

    // ---- match mode: one definition at a time, its word falls among two others
    const clues =
      mk && it.type === "match"
        ? mk.fall === "right"
          ? it.left
          : it.right
        : [];
    const fallers =
      mk && it.type === "match"
        ? mk.fall === "right"
          ? it.right
          : it.left
        : [];
    /** [left, right] for a clue and a falling word. */
    const pairOf = (c: string, f: string): [string, string] =>
      mk?.fall === "right" ? [c, f] : [f, c];
    let clueAt = 0;
    const done: [string, string][] = [];
    const used = new Set<string>();
    const rightFor = (c: string) =>
      fallers.find((f) => mk && isPair(it.id, mk, ...pairOf(c, f)));
    function dropWave(slower = 1) {
      if (!mk) return;
      const c = clues[clueAt];
      const right = rightFor(c);
      const free = fallers.filter((f) => f !== right && !used.has(f));
      const pool = free.length >= 2 ? free : fallers.filter((f) => f !== right);
      const labels = shuffled([
        ...(right ? [right] : []),
        ...shuffled(pool).slice(0, 2),
      ]);
      setClue({ text: c, at: clueAt, of: clues.length });
      const words = c.split(/\s+/).length;
      dropStars(
        labels,
        approachMs({ type: "mcq", prompt: c, options: labels }, pace) -
          words * 100,
        slower,
      );
    }
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

    /** A ring of light that pops outwards where a star is caught. */
    const pop = (x: number, y: number, now: number) => {
      parts.push({ kind: "ring", x, y, born: now, vx: 0, vy: 0 });
      burst(x, y - 2, now, 8);
    };
    /** Grey shards flying off a broken star. */
    const shatter = (x: number, y: number, now: number) => {
      for (let k = 0; k < 6; k++)
        parts.push({
          kind: "shard",
          x,
          y,
          born: now,
          vx: (Math.random() - 0.5) * 0.09,
          vy: -0.05 - Math.random() * 0.05,
          f: k % 3,
        });
    };

    const finish = (verdict: "correct" | "partial" | "incorrect") => {
      setTimeout(() => {
        s.phase = "done";
        callbacks.current.onFinished(verdict);
      }, 1200);
    };

    /** The spelled letters as the student's answer. */
    const spelledAnswer = (letters: string): ItemResponse =>
      it.type === "typed" && key
        ? { type: "typed", text: fillMask(key, letters) }
        : { type: "dictation", text: letters };

    /** Sends the answer and plays the outcome. */
    const judge = async (answer: ItemResponse, caught: Star | null) => {
      s.phase = "judging";
      s.at = performance.now();
      const res = await callbacks.current.onChoose(answer);
      const now = performance.now();
      s.at = now;
      if (!res) {
        // network trouble: let the student try again
        s.phase = "play";
        if (!key) dropChoices();
        if (caught) caught.state = "gone";
        syncTokens();
        return;
      }
      if (res.verdict === "correct") {
        // Right: straight on to the next question; the cheer plays on there.
        const text = combo + 1 >= 3 ? `${combo + 1} in a row!` : "Correct!";
        s.phase = "done";
        if (caught) caught.state = "gone";
        setBanner({ text, good: true });
        pop(s.x, RIM - 6, now);
        burst(s.x, RIM - 6, now, 14);
        syncTokens();
        carry.x = s.x;
        carry.winAt = now;
        carry.winText = text;
        callbacks.current.onFinished("correct");
      } else {
        s.phase = "lost";
        s.hurtAt = now;
        if (caught) {
          caught.state = "cracked";
          shatter(s.x, RIM - 6, now);
        }
        if (it.type === "mcq") {
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
      if (mk) {
        // matching: the right word ticks off this definition; a wrong one costs a heart
        const pair = pairOf(clues[clueAt], t.text);
        if (isPair(it.id, mk, ...pair)) {
          done.push(pair);
          used.add(t.text);
          clueAt += 1;
          pop(t.x, RIM - 4, now);
          playSfx("tap", 0.4);
          for (const o of s.stars) o.state = "gone";
          syncTokens();
          if (clueAt >= clues.length)
            void judge({ type: "match", pairs: done }, null);
          else dropWave();
        } else {
          heartsLeft -= 1;
          setHearts(heartsLeft);
          t.state = "cracked";
          t.at = now;
          s.hurtAt = now;
          shatter(t.x, RIM - 6, now);
          playSfx("wrong", 0.25);
          syncTokens();
          if (heartsLeft <= 0) {
            // out of hearts: send the matching as it stands (this wrong pick, the rest unpaired)
            for (const o of s.stars) if (o.state === "fall") o.state = "gone";
            syncTokens();
            const rest = fallers.filter((f) => !used.has(f) && f !== t.text);
            const pairs: [string, string][] = [...done, pair];
            for (const c of clues.slice(clueAt + 1)) {
              const f = rest.shift();
              if (f) pairs.push(pairOf(c, f));
            }
            void judge({ type: "match", pairs }, t);
          }
        }
        return;
      }
      if (t.grey) {
        // the Grey Fox's grey star: caught, it counts as a wrong answer
        bubbleShatter();
        for (const o of s.stars) if (o.grey && o !== t) o.state = "gone";
        void judge({ type: "mcq", choice: GREY_STAR }, t);
        return;
      }
      if (!key) {
        t.state = "caught";
        t.at = now;
        playSfx("tap", 0.35);
        void judge({ type: "mcq", choice: t.text }, t);
        return;
      }
      // spelling: the right next letter fills a slot; a wrong one costs a heart
      if (isNextLetter(it.id, key, prefix, t.text)) {
        prefix += t.text;
        setSpelled(prefix);
        t.state = "gone";
        pop(t.x, RIM - 4, now);
        playSfx("tap", 0.4);
        syncTokens();
        if (prefix.length >= key.n) {
          for (const o of s.stars) if (o.state === "fall") o.state = "gone";
          syncTokens();
          void judge(spelledAnswer(prefix), null);
        }
      } else {
        heartsLeft -= 1;
        setHearts(heartsLeft);
        t.state = "cracked";
        t.at = now;
        s.hurtAt = now;
        shatter(t.x, RIM - 6, now);
        playSfx("wrong", 0.25);
        syncTokens();
        if (heartsLeft <= 0) {
          for (const o of s.stars) if (o.state === "fall") o.state = "gone";
          syncTokens();
          void judge(spelledAnswer(prefix + t.text), t);
        }
      }
    };

    // ---- the still background, painted once: the unit's sky, then its ground with depth
    const bg = document.createElement("canvas");
    bg.width = W;
    bg.height = H;
    {
      const b = bg.getContext("2d")!;
      b.drawImage(strip, 0, 12, W, SKY, 0, 0, W, SKY);
      // ground: lighter haze at the horizon, the unit's colour, deeper towards the front
      const bands: [number, string][] = [
        [SKY, ground.mark],
        [SKY + 5, ground.a],
        [SKY + Math.round((GROUND - SKY) * 0.62), ground.b],
      ];
      bands.forEach(([y0, c0], i) => {
        const y1 = bands[i + 1]?.[0] ?? H;
        b.fillStyle = col(c0);
        b.fillRect(0, y0, W, y1 - y0);
        // dither the seam into the next band
        if (bands[i + 1]) {
          b.fillStyle = col(bands[i + 1][1]);
          for (let y = y1 - 4; y < y1; y++)
            for (let x = (y % 2) * 2; x < W; x += y >= y1 - 2 ? 2 : 4)
              b.fillRect(x, y, 1, 1);
        }
      });
      b.fillStyle = col(ground.edge);
      b.fillRect(0, SKY, W, 1);
      // a few soft mounds over the field, bigger nearer the front
      for (let k = 0; k < 9; k++) {
        const y = SKY + 12 + ((k * 61) % (GROUND - SKY - 18));
        const x = (k * 47 + 13) % (W - 10);
        const big = y > SKY + (GROUND - SKY) / 2;
        const w = big ? 7 : 4;
        b.globalAlpha = 0.45;
        b.fillStyle = col(ground.b);
        b.fillRect(x, y, w, 1);
        b.fillRect(x + 1, y - 1, w - 2, 1);
        b.fillStyle = col(ground.mark);
        b.fillRect(x + 1, y - 2, Math.max(1, w - 4), 1);
        b.globalAlpha = 1;
      }
      b.fillStyle = col(ground.edge);
      b.fillRect(0, GROUND, W, 1);
      b.globalAlpha = 0.35;
      b.fillRect(0, GROUND + 1, W, H - GROUND - 1);
      b.globalAlpha = 1;
    }
    /** Tiny stars twinkling in the sky band. */
    const twinkles = Array.from({ length: 7 }, (_, k) => ({
      x: (k * 23 + 9) % W,
      y: 2 + ((k * 7) % (SKY - 10)),
      p: k * 0.9,
    }));

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
      if (!s.paused) clock += dt;
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
          // where Nova stands, for tests and tools (only written when it changes)
          const sx = String(Math.round(s.x));
          if (section && section.dataset.x !== sx) section.dataset.x = sx;
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
          // The Grey Fox's game: DROP lets the trembling stars go at once, and grey stars fall
          // every so often while the answers wait at the top.
          if (fox) {
            if (s.boost)
              for (const t of s.stars) if (t.holdUntil) t.holdUntil = 0;
            const waiting = s.stars.some(
              (t) => !t.grey && t.state === "fall" && (t.holdUntil ?? 0) > now,
            );
            // He steps in from the far side, winds up (its landing spot blinks), and throws.
            if (!thr && waiting && clock >= greyAt) {
              const toX = greyHere
                ? Math.round(s.x)
                : foxGreyX(Math.random, s.x, W);
              thr = { at: clock, toX, side: foxSide(toX, W), launched: false };
              if (greyHere) foxGreyAsked = true;
              greyHere = false;
            }
            if (thr) {
              const st = foxThrowStage(clock - thr.at);
              if (st.released && !thr.launched) {
                thr.launched = true;
                const from = foxPaw(thr.side);
                foxThrow();
                s.stars.push({
                  id: nextId++,
                  text: "",
                  idx: -2,
                  x: from.x,
                  y: from.y,
                  startY: from.y,
                  vy: 0,
                  state: "fall",
                  at: now,
                  grey: true,
                  arc: {
                    from,
                    to: { x: thr.toX, y: GROUND - STAR_H },
                    at: clock,
                  },
                });
                if (section)
                  section.dataset.grey = String(
                    Number(section.dataset.grey ?? 0) + 1,
                  );
              }
              if (st.stage === "gone") {
                thr = null;
                const [lo, hi] = FOX_STAR_RULES.greyEveryMs;
                greyAt = clock + lo + Math.random() * (hi - lo);
              }
            }
          }
          for (const t of s.stars) {
            if (t.state !== "fall") continue;
            let v = t.vy * (s.boost && !fox ? (key ? 3 : 6) : 1);
            if (!key && reduced && !s.boost && !fox)
              v = t.y < t.startY ? t.vy * 8 : 0;
            if (fox && !t.grey && t.y >= t.startY && (t.holdUntil ?? 0) > now)
              v = 0; // trembling at the top
            if (!key && !t.grey && t.y < t.startY) v = Math.max(v, 0.12); // slide into view first
            const was = t.y + STAR_H;
            if (t.arc) {
              // a thrown grey star flies along its arc
              const pt = arcPoint(
                t.arc.from,
                t.arc.to,
                (clock - t.arc.at) / FOX_STAR_RULES.flightMs,
              );
              t.x = pt.x;
              t.y = pt.y;
            } else t.y += v * dt;
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
          } else if (!s.stars.some((t) => t.state === "fall" && !t.grey)) {
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

      // ---- draw: the painted background, the sky twinkling
      ctx.drawImage(bg, 0, 0);
      ctx.fillStyle = col("f");
      for (const tw of twinkles) {
        const on = Math.sin(now / 420 + tw.p);
        if (on > 0.2) ctx.fillRect(tw.x, tw.y, 1, 1);
        if (on > 0.85) {
          ctx.fillRect(tw.x - 1, tw.y, 3, 1);
          ctx.fillRect(tw.x, tw.y - 1, 1, 3);
        }
      }

      // where each falling star will land: a shadow that grows darker as it comes down
      ctx.fillStyle = col("k");
      for (const t of s.stars) {
        if (t.state !== "fall" || t.y < -STAR_H) continue;
        // a thrown star's shadow waits on its landing spot, darkening as it comes
        const p = t.arc
          ? Math.max(
              0,
              Math.min(1, (clock - t.arc.at) / FOX_STAR_RULES.flightMs),
            )
          : Math.max(0, Math.min(1, (t.y + STAR_H - SKY) / (GROUND - SKY)));
        const sx = t.arc ? t.arc.to.x : t.x;
        const w = Math.round(5 + p * 11);
        ctx.globalAlpha = 0.1 + p * 0.22;
        ctx.fillRect(Math.round(sx - w / 2), GROUND - 2, w, 2);
        ctx.fillRect(
          Math.round(sx - w / 2) + 2,
          GROUND - 3,
          Math.max(1, w - 4),
          1,
        );
      }
      // and Nova's own shadow
      ctx.globalAlpha = 0.22;
      ctx.fillRect(Math.round(s.x - 13), FEET - 1, 26, 2);
      ctx.globalAlpha = 1;

      // where a grey star will land blinks red: from his wind-up until it lands
      const marks: number[] = [];
      if (thr && !foxThrowStage(clock - thr.at).released) marks.push(thr.toX);
      for (const t of s.stars)
        if (t.arc && t.state === "fall") marks.push(t.arc.to.x);
      if (marks.length && Math.floor(clock / 130) % 2 === 0) {
        ctx.fillStyle = col("*");
        for (const mx of marks) {
          const cx0 = Math.round(mx);
          const cy0 = GROUND - 4;
          for (const [dx, dy] of [
            [-2, -2],
            [2, -2],
            [-1, -1],
            [1, -1],
            [0, 0],
            [-1, 1],
            [1, 1],
            [-2, 2],
            [2, 2],
          ])
            ctx.fillRect(cx0 + dx, cy0 + dy, 1, 1);
        }
      }

      // the Grey Fox at the side of the field, throwing a grey star
      if (thr) {
        const st = foxThrowStage(clock - thr.at);
        if (st.stage !== "gone") {
          const fx = foxX(thr.side, st.out);
          ctx.fillStyle = col("k");
          ctx.globalAlpha = 0.25;
          ctx.fillRect(fx + 8, GROUND - 1, FOX_W - 14, 2);
          ctx.globalAlpha = 1;
          // on the left he faces right, towards the field
          const spr =
            thr.side < 0 ? GREY_FOX.throwStarRight : GREY_FOX.throwStar;
          ctx.drawImage(img(spr, st.frame), fx, FOX_Y);
        }
      }

      // stars, each with a comet tail while it falls
      const elapsed = Math.max(0, now - s.at);
      for (const t of s.stars) {
        if (t.state === "gone") continue;
        let spr = t.grey ? greyStar : fallingStar;
        let f = frameOf(fallingStar, 5, now + t.id * 170);
        let y = t.y;
        let x = t.x;
        // the Grey Fox's stars hang still, then tremble just before they drop (harder at the end)
        if (
          fox &&
          !reduced &&
          !t.grey &&
          t.state === "fall" &&
          t.y >= t.startY &&
          (t.holdUntil ?? 0) > now &&
          (t.holdUntil ?? 0) - now <= FOX_STAR_RULES.shakeMs
        ) {
          const amp = (t.holdUntil ?? 0) - now < FOX_STAR_RULES.warnMs ? 2 : 1;
          x += (Math.floor(now / 45) + t.id) % 2 ? amp : -amp;
          if (amp > 1) y += Math.floor(now / 60) % 2;
        }
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
          x = goesOn ? t.x : s.x;
          if (goesOn && now - t.at > 500) {
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
        if (
          t.state === "fall" &&
          t.y > -STAR_H + 2 &&
          !t.grey &&
          !(fox && (t.holdUntil ?? 0) > now)
        ) {
          const len = combo >= 3 ? 9 : 6;
          for (let k = 1; k <= len; k++) {
            ctx.globalAlpha = Math.max(0, 0.75 - k / (len + 1));
            ctx.fillStyle = col(k % 3 === 0 ? "w" : k < 3 ? "f" : "y");
            const wob = Math.round(Math.sin(now / 140 + k + t.id) * 0.7);
            ctx.fillRect(
              Math.round(t.x) + wob - (k < 3 ? 1 : 0),
              Math.round(t.y + 3 - k * 3),
              k < 3 ? 2 : 1,
              2,
            );
          }
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(img(spr, f), Math.round(x - STAR_W / 2), Math.round(y));
        ctx.globalAlpha = 1;

        // the label (an answer under the star, or a letter on it)
        const label = labelRefs.current.get(t.id);
        if (label) {
          const ly = key ? y + STAR_H * 0.58 : y + STAR_H + 3;
          const cw = canvas.clientWidth;
          const sx = (x / W) * cw;
          if (key) label.style.left = `${sx}px`;
          else {
            // keep the label inside the field; its notch still points at the star
            const lw =
              Number(label.dataset.w) ||
              ((label.dataset.w = String(label.offsetWidth)),
              label.offsetWidth);
            const left = Math.max(lw / 2 + 3, Math.min(cw - lw / 2 - 3, sx));
            label.style.left = `${left}px`;
            label.style.setProperty(
              "--notch",
              `${Math.max(6, Math.min(lw - 6, sx - left + lw / 2))}px`,
            );
          }
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

      // dust, sparkles, rings and shards
      for (let k = parts.length - 1; k >= 0; k--) {
        const p = parts[k];
        const age = now - p.born;
        const life =
          p.kind === "dust"
            ? 420
            : p.kind === "ring"
              ? 320
              : p.kind === "shard"
                ? 700
                : 650;
        if (age > life) {
          parts.splice(k, 1);
          continue;
        }
        if (p.kind === "ring") {
          // a ring of light popping outwards
          const r = 3 + (age / life) * 11;
          ctx.globalAlpha = 1 - age / life;
          ctx.fillStyle = col("f");
          for (let a = 0; a < 16; a++) {
            const ang = (a / 16) * Math.PI * 2;
            ctx.fillRect(
              Math.round(p.x + Math.cos(ang) * r),
              Math.round(p.y + Math.sin(ang) * r * 0.8),
              1,
              1,
            );
          }
          ctx.globalAlpha = 1;
          continue;
        }
        if (p.kind === "shard") {
          ctx.globalAlpha = Math.min(1, 2 - (2 * age) / life);
          ctx.drawImage(
            img(shard, p.f ?? 0),
            Math.round(p.x + p.vx * age),
            Math.round(p.y + p.vy * age + 0.00018 * age * age),
          );
          ctx.globalAlpha = 1;
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
        // 1–4: run under that star
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
  }, [item.id, optionsKey, decoy, unitId, sprites, field]);

  const n =
    item.type === "dictation" || item.type === "typed" ? item.spell.n : 0;
  const mask =
    item.type === "dictation" || item.type === "typed"
      ? (item.spell.mask ?? "_".repeat(n))
      : "";

  // Tap or drag anywhere on the game (not on its buttons): Nova runs to that spot, and follows
  // a dragging finger. A tap while paused carries on.
  const dragging = useRef(false);
  const aim = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !field) return;
    const p = toField(
      e.clientX,
      e.clientY,
      canvas.getBoundingClientRect(),
      W,
      field.h,
    );
    g.current.target = catcherX(p.x, W);
    g.current.dir = 0;
  };
  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (isControl(e.target)) return;
    if (g.current.paused) {
      togglePause();
      return;
    }
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    aim(e);
  };
  const stopDragging = () => {
    dragging.current = false;
  };
  const setDir = (dir: number) => {
    g.current.dir = dir;
  };
  const step = (dir: number) => {
    g.current.target = Math.max(12, Math.min(W - 12, g.current.x + dir * 24));
  };

  return (
    <section
      ref={sectionRef}
      className="mx-auto mt-2 flex min-h-0 w-full flex-1 touch-none select-none flex-col font-pixel"
      aria-label="Star catch"
      data-item={item.id}
      data-mode={mode}
      onPointerDown={onPointerDown}
      onPointerMove={(e) => dragging.current && aim(e)}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
    >
      <div className="pixel-panel px-4 py-3 text-[#ece4d6]" data-no-steer>
        {item.type === "mcq" || item.type === "typed" ? (
          <>
            {fox && (
              <p className="text-[11px] uppercase tracking-widest text-[#cf9c55]">
                The Grey Fox asks:
              </p>
            )}
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
        ) : item.type === "match" ? (
          <>
            <p className="flex justify-between text-xs uppercase tracking-widest text-[#a99cc4]">
              <span>Catch the word that matches</span>
              {clue && (
                <span aria-label={`Pair ${clue.at + 1} of ${clue.of}`}>
                  {clue.at + 1} / {clue.of}
                </span>
              )}
            </p>
            <p
              className="mt-1 min-h-[3.5rem] font-sans text-lg leading-snug"
              data-clue
            >
              {clue?.text}
            </p>
          </>
        ) : (
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
        )}
        {spell && (
          <p
            className="mt-3 flex flex-wrap justify-center gap-x-1.5 gap-y-1 text-3xl tracking-wide"
            aria-label={`Spelled so far: ${spelled.split("").join(" ") || "nothing yet"}. ${n} letters.`}
          >
            {(() => {
              let li = 0;
              return [...mask].map((m, i) => {
                if (m !== "_")
                  return (
                    <span
                      key={i}
                      className={cx(
                        "inline-block text-center text-[#a99cc4]",
                        m === " " ? "w-3" : "w-4",
                      )}
                    >
                      {m}
                    </span>
                  );
                const ch = spelled[li++];
                return (
                  <span
                    key={i}
                    className={cx(
                      "inline-block w-6 text-center",
                      ch ? "text-[#c9dfa0]" : "text-[#5a5560]",
                    )}
                  >
                    {ch?.toUpperCase() ?? "_"}
                  </span>
                );
              });
            })()}
          </p>
        )}
      </div>

      {/* The field fills the space left between the question and the buttons. */}
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <div className="pixel-panel relative mt-2 flex min-h-[11rem] flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between bg-[#1d1730] px-3 py-1.5 text-[#ead39b]">
            <div
              className="flex min-w-[4.5rem] gap-1"
              aria-label={
                foxHearts
                  ? `${foxHearts.left} of ${foxHearts.of} hearts left`
                  : mode !== "choice"
                    ? `${hearts} ${hearts === 1 ? "heart" : "hearts"} left`
                    : undefined
              }
            >
              {foxHearts &&
                Array.from({ length: foxHearts.of }, (_, i) => (
                  <PixelSprite
                    key={i}
                    sprite={i < foxHearts.left ? heartFull : heartEmpty}
                    scale={2}
                  />
                ))}
              {mode !== "choice" &&
                Array.from({ length: STAR_RULES.hearts }, (_, i) => (
                  <PixelSprite
                    key={i}
                    sprite={i < hearts ? heartFull : heartEmpty}
                    scale={2}
                  />
                ))}
            </div>
            <span className="text-sm tracking-[0.2em]">
              {fox ? "THE GREY FOX" : "STAR CATCH"}
            </span>
            <span className="flex min-w-[4.5rem] items-center justify-end gap-1 text-sm">
              <PixelSprite sprite={pixelStar} scale={2} />
              {xp}
              {combo >= 2 && <span className="text-[#a99cc4]">×{combo}</span>}
            </span>
          </div>
          <div
            className="relative min-h-0 flex-1"
            style={{ background: PALETTE[laneGround(unitId).b] }}
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
                          ? "-translate-y-1/2 text-[22px] text-[#3a2614] [text-shadow:0_1px_0_#f6e7b8] sm:text-[26px]"
                          : "border-2 border-[#241c2b] bg-[#f3e3b8] px-1.5 pb-[3px] pt-[4px] text-[13px] text-[#2b1f17] shadow-[2px_2px_0_#241c2b66] sm:text-[15px] before:absolute before:-top-[7px] before:left-[var(--notch,50%)] before:-translate-x-1/2 before:border-x-[5px] before:border-b-[5px] before:border-x-transparent before:border-b-[#241c2b] before:content-['']",
                      )}
                      style={{ left: "50%", top: "-20%", opacity: 0 }}
                    >
                      {t.text}
                    </div>
                  ))}
                  <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[11px] text-[#cf9c55]/70">
                    ◀ tap or drag to move Nova ▶
                  </p>
                  {banner && (
                    <div
                      className={cx(
                        "pointer-events-none absolute inset-x-0 top-[24%] text-center text-2xl [text-shadow:2px_2px_0_#241c2b] sm:text-3xl",
                        banner.good ? "text-[#f6e7b8]" : "text-[#cf9f9b]",
                      )}
                      role="status"
                    >
                      <span className="inline-block border-2 border-[#241c2b] bg-[#241c2bd9] px-3 pb-0.5 pt-1">
                        {banner.text}
                      </span>
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
        </div>

        <div className="mt-2 flex items-center justify-center gap-2">
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

      <div
        className="pixel-panel mt-3 hidden items-start gap-3 px-4 py-3 text-[#ece4d6] [@media(min-height:900px)]:flex"
        data-no-steer
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center bg-[#cf9c55]">
          <PixelSprite sprite={pixelStar} scale={3} />
        </span>
        <div>
          <p className="text-[#ead39b]">
            {spell
              ? "Star Catcher: spelling"
              : mode === "match"
                ? "Star Catcher: matching"
                : "Star Catcher"}
          </p>
          <p className="mt-0.5 text-sm text-[#cdbfa8]">
            {spell
              ? "Letters fall from the sky. Catch the next letter of the word, and dodge the wrong ones! (Or type the letter.)"
              : mode === "match"
                ? "Read the meaning, then catch the word that matches it. A wrong word costs a heart. (Keys 1–3 run to a star.)"
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
