/**
 * Rules for Star Catch (pure functions, shared by the game, the server and tests).
 *
 * Two ways to play:
 * - choice: the answers of a multiple-choice question fall as stars; Nova catches one in her
 *   basket and it is sent as the answer (the server grades it, as always).
 * - spell: a spelling word is heard, and letters fall from the sky; Nova catches the letters
 *   of the word in order and dodges the wrong ones. The finished word is sent as a normal
 *   dictation answer.
 *
 * Spelling words must never be sent to the browser as text. Instead each dictation item
 * carries a "spell key": one short hash per prefix of the word. The game checks a caught
 * letter by hashing the letters so far, without the word ever being in the page.
 */

import type { RunnerQuestion } from "./runner";

export const STAR_RULES = {
  /** Answers longer than this don't fit under a star; such questions use the runner or cards. */
  maxOptionChars: 16,
  minStars: 2,
  maxStars: 4,
  /** Spelling words: letters only, at most this long. */
  maxWordLetters: 14,
  /** Wrong letters Nova may catch before the word counts as a mistake. */
  hearts: 3,
  /** Letters falling at the same time. */
  lettersAtOnce: 3,
  /** Time for a letter to fall from the top to Nova's basket (scaled by pace). */
  letterFallMs: 4200,
  /** Time between two new letters (scaled by pace). */
  letterGapMs: 1150,
  /** Multiple-choice questions are played in blocks: a few in one game, then a few in the other. */
  block: 3,
};

/** Can this multiple-choice question be played as falling stars? 2–4 short answers. */
export function starEligible(q: RunnerQuestion): boolean {
  if (q.type !== "mcq" || !q.options) return false;
  const n = q.options.length;
  return (
    n >= STAR_RULES.minStars &&
    n <= STAR_RULES.maxStars &&
    q.options.every((o) => o.length <= STAR_RULES.maxOptionChars)
  );
}

/**
 * Which game plays the n-th game-eligible multiple-choice question of a round (0-based):
 * blocks of 3 in Star Catch, then 3 in the runner, and so on. A question whose answers are
 * too long for stars goes to the runner.
 */
export function mcqGame(n: number, fitsStars: boolean): "stars" | "runner" {
  if (!fitsStars) return "runner";
  return Math.floor(n / STAR_RULES.block) % 2 === 0 ? "stars" : "runner";
}

// ---------------------------------------------------------------------------
// Spelling: prefix hashes

/** What the browser gets for a spelling word: its length and one hash per prefix. */
export interface SpellKey {
  n: number;
  h: string[];
}

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Hash of a prefix of the word ("o", "or", "orc", …) for one item. Case does not matter. */
export function prefixHash(itemId: string, prefix: string): string {
  const p = prefix.toLowerCase();
  return (fnv(`star:${itemId}:${p}`) ^ fnv(`${p.length}:${itemId}`)).toString(
    36,
  );
}

/** The spell key for a word, or undefined if the word can't be played with letters. */
export function spellKey(itemId: string, word: string): SpellKey | undefined {
  const w = word.toLowerCase();
  if (!/^[a-z]+$/.test(w) || w.length > STAR_RULES.maxWordLetters)
    return undefined;
  return {
    n: w.length,
    h: [...w].map((_, i) => prefixHash(itemId, w.slice(0, i + 1))),
  };
}

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** Is `letter` the right next letter after `prefix`? */
export function isNextLetter(
  itemId: string,
  key: SpellKey,
  prefix: string,
  letter: string,
): boolean {
  const i = prefix.length;
  if (i >= key.n) return false;
  return prefixHash(itemId, prefix + letter) === key.h[i];
}

/** The right next letter after `prefix` (the game needs it to make sure it falls), or null. */
export function nextLetter(
  itemId: string,
  key: SpellKey,
  prefix: string,
): string | null {
  for (const ch of ALPHABET)
    if (isNextLetter(itemId, key, prefix, ch)) return ch;
  return null;
}

/** Letters that are easy to mix up with each other: good wrong letters. */
const LOOKALIKE: Record<string, string> = {
  a: "eou",
  b: "dp",
  c: "ks",
  d: "bt",
  e: "aiy",
  f: "v",
  g: "j",
  h: "n",
  i: "ey",
  j: "g",
  k: "c",
  l: "i",
  m: "n",
  n: "m",
  o: "ua",
  p: "b",
  q: "k",
  r: "l",
  s: "cz",
  t: "d",
  u: "o",
  v: "f",
  w: "v",
  x: "s",
  y: "i",
  z: "s",
};

/**
 * A wrong letter to drop next to the right one: usually one that is easy to confuse with it,
 * sometimes any letter. Never the right letter or one already falling.
 */
export function decoyLetter(
  next: string,
  falling: string[],
  rand: () => number = Math.random,
): string {
  const avoid = new Set([next, ...falling]);
  const near = [...(LOOKALIKE[next] ?? "")].filter((c) => !avoid.has(c));
  if (near.length && rand() < 0.6)
    return near[Math.floor(rand() * near.length)];
  const rest = [...ALPHABET].filter((c) => !avoid.has(c));
  return rest[Math.floor(rand() * rest.length)];
}

/** How long the answer stars take to fall to Nova (ms): the runner's reading time, a little longer. */
export function starFallMs(approach: number): number {
  return Math.round(approach * 1.1);
}

/** Horizontal centres for n answer stars across a field `w` wide, and a stagger for each. */
export function starColumns(n: number, w: number): { x: number; dy: number }[] {
  const margin = 18;
  const step = n > 1 ? (w - margin * 2) / (n - 1) : 0;
  const stagger = [0, 22, 8, 30];
  return Array.from({ length: n }, (_, i) => ({
    x: Math.round(n > 1 ? margin + i * step : w / 2),
    dy: stagger[i % stagger.length],
  }));
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * A third star for a question with only two answers, so there are always at least three to
 * choose from: a word from another question in the round that isn't one of this question's
 * answers (catching it is simply a wrong answer). Stable for a question; null if none fits.
 */
export function pickDecoy(
  itemId: string,
  options: string[],
  pool: string[],
): string | null {
  if (options.length >= 3) return null;
  const own = new Set(options.map(norm));
  const fits = [...new Set(pool)]
    .filter(
      (p) =>
        p.trim() && !own.has(norm(p)) && p.length <= STAR_RULES.maxOptionChars,
    )
    .sort();
  if (!fits.length) return null;
  return fits[fnv(`decoy:${itemId}`) % fits.length];
}

/** The answers shown as stars: the question's own, with the decoy (if any) slotted in. */
export function withDecoy(
  itemId: string,
  options: string[],
  decoy: string | null | undefined,
): string[] {
  if (!decoy || options.length >= 3) return options;
  const at = fnv(`slot:${itemId}`) % (options.length + 1);
  return [...options.slice(0, at), decoy, ...options.slice(at)];
}
