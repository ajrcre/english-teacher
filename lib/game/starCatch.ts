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

import type { GamePick } from "./pick";
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
 * Which game plays the n-th game-eligible multiple-choice question of a round (0-based).
 * Both games ("mix"): blocks of 3 in Star Catch, then 3 in the runner, and so on. A chosen
 * single game plays every question. A question whose answers are too long for stars always
 * goes to the runner.
 */
export function mcqGame(n: number, fitsStars: boolean, pick: GamePick = "mix"): "stars" | "runner" {
  if (!fitsStars || pick === "runner") return "runner";
  if (pick === "stars") return "stars";
  return Math.floor(n / STAR_RULES.block) % 2 === 0 ? "stars" : "runner";
}

// ---------------------------------------------------------------------------
// Spelling: prefix hashes

/**
 * What the browser gets for a word to spell: how many letters, one hash per prefix, and for
 * answers of more than one word a mask of where the spaces and marks go ("___ ____").
 */
export interface SpellKey {
  n: number;
  h: string[];
  mask?: string;
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

/**
 * The spell key for a word (or a short answer such as "had gone"), or undefined if it can't be
 * played with falling letters. Spaces, hyphens, apostrophes, commas and slashes are filled in
 * for the student; only letters fall.
 */
export function spellKey(
  itemId: string,
  word: string,
  maxLetters: number = STAR_RULES.maxWordLetters,
): SpellKey | undefined {
  const text = word.trim().toLowerCase();
  if (!/^[a-z][a-z ,'/-]*[a-z]$|^[a-z]$/.test(text)) return undefined;
  const w = text.replace(/[^a-z]/g, "");
  if (w.length > maxLetters) return undefined;
  const key: SpellKey = {
    n: w.length,
    h: [...w].map((_, i) => prefixHash(itemId, w.slice(0, i + 1))),
  };
  if (w !== text) key.mask = text.replace(/[a-z]/g, "_");
  return key;
}

/** The letters so far written into the answer's shape: "hadgo" + "___ ____" → "had go". */
export function fillMask(key: SpellKey, letters: string): string {
  if (!key.mask) return letters;
  let i = 0;
  let out = "";
  for (const ch of key.mask) {
    if (ch === "_") {
      if (i >= letters.length) break;
      out += letters[i++];
    } else out += ch;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Matching: pair hashes

/**
 * What the browser gets for a matching question: which side falls as stars (the side with
 * short entries; the other side is shown as the clue) and one hash per right pair.
 */
export interface MatchKey {
  fall: "left" | "right";
  h: string[];
}

export function pairHash(itemId: string, left: string, right: string): string {
  const l = left.trim().toLowerCase();
  const r = right.trim().toLowerCase();
  return (fnv(`pair:${itemId}:${l}\u0000${r}`) ^ fnv(`${r}|${itemId}|${l.length}`)).toString(36);
}

/** The match key, or undefined if neither side is short enough to fall as stars. */
export function matchKey(itemId: string, pairs: [string, string][]): MatchKey | undefined {
  if (pairs.length < 2 || pairs.length > 8) return undefined;
  const longest = (side: 0 | 1) => Math.max(...pairs.map((p) => p[side].length));
  const fits = (side: 0 | 1) => longest(side) <= STAR_RULES.maxOptionChars + 2;
  const fall = fits(1) && (!fits(0) || longest(1) < longest(0)) ? "right" : fits(0) ? "left" : null;
  if (!fall) return undefined;
  return { fall, h: pairs.map(([l, r]) => pairHash(itemId, l, r)).sort() };
}

/** Is this a right pair? */
export function isPair(itemId: string, key: MatchKey, left: string, right: string): boolean {
  return key.h.includes(pairHash(itemId, left, right));
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

/**
 * The Grey Fox's Star Catch (only in his battle): the answer stars wait at the top for the
 * reading time, tremble for the last moment, then drop straight and fast; meanwhile grey stars
 * fall that must not be caught.
 */
export const FOX_STAR_RULES = {
  /** Time for an answer star to drop from the top to Nova's basket, once it lets go (ms). */
  dropMs: 450,
  /** Grey stars take a little longer, so they can be dodged. */
  greyDropMs: 700,
  /** A grey star every so often while the answers tremble (ms, random in this range). */
  greyEveryMs: [1200, 1800] as const,
  /** The stars hang still while the question is read, and tremble only this long before they drop (ms). */
  shakeMs: 1500,
  /** Shaking harder in the last moments before the drop (ms). */
  warnMs: 600,
};

/** The answer a caught grey star sends: not an option, so it's graded as wrong. */
export const GREY_STAR = "(grey star)";

/** Where a grey star falls: half the time near Nova (to dodge), otherwise anywhere. */
export function foxGreyX(rand: () => number, novaX: number, w: number): number {
  const x = rand() < 0.5 ? novaX + (rand() - 0.5) * 36 : 16 + rand() * (w - 32);
  return Math.round(Math.max(16, Math.min(w - 16, x)));
}

/** Where Nova may stand in a field `w` wide: a tapped point is clamped to this. */
export function catcherX(x: number, w: number): number {
  return Math.max(12, Math.min(w - 12, x));
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
