import { spellKey, type SpellKey } from "@/lib/game/starCatch";
import type { Item, ItemType } from "./schema";

/**
 * What the browser receives before the student answers: the question only.
 * No answer keys, explanations, Hebrew notes or model answers.
 */
export type ClientItem =
  | { id: string; type: "mcq"; prompt: string; sentence?: string; options: string[] }
  | { id: string; type: "typed"; prompt: string; sentence?: string }
  | { id: string; type: "match"; prompt: string; left: string[]; right: string[] }
  | { id: string; type: "sort"; prompt: string; buckets: string[]; entries: string[] }
  | { id: string; type: "sequence"; prompt: string; steps: string[] }
  | { id: string; type: "dictation"; audioId: string; spell?: SpellKey }
  | { id: string; type: "open"; question: string; context?: string }
  | { id: string; type: "rewrite"; prompt: string; original: string; starter?: string }
  | { id: string; type: "proofread"; prompt: string; text: string };

export type ClientItemOf<T extends ItemType> = Extract<ClientItem, { type: T }>;

/** The student's response, per item type. */
export type ItemResponse =
  | { type: "mcq"; choice: string }
  | { type: "typed"; text: string }
  | { type: "match"; pairs: [string, string][] }
  | { type: "sort"; placement: Record<string, string> }
  | { type: "sequence"; order: string[] }
  | { type: "dictation"; text: string }
  | { type: "open"; text: string }
  | { type: "rewrite"; text: string }
  | { type: "proofread"; text: string };

/** Small deterministic PRNG so a shuffle is stable for a given seed. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle<T>(list: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Never present a sequence already in the right order.
  if (out.length > 2 && out.every((v, i) => v === list[i])) {
    [out[0], out[1]] = [out[1], out[0]];
  }
  return out;
}

/** Strip answers and shuffle choices. `seed` keeps shuffles stable within a session. */
export function toClientItem(item: Item, seed = ""): ClientItem {
  const s = `${item.id}:${seed}`;
  switch (item.type) {
    case "mcq":
      return { id: item.id, type: "mcq", prompt: item.prompt, sentence: item.sentence, options: seededShuffle(item.options, s) };
    case "typed":
      return { id: item.id, type: "typed", prompt: item.prompt, sentence: item.sentence };
    case "match":
      return {
        id: item.id,
        type: "match",
        prompt: item.prompt,
        left: seededShuffle(item.pairs.map((p) => p[0]), s + "L"),
        right: seededShuffle(item.pairs.map((p) => p[1]), s + "R"),
      };
    case "sort":
      return { id: item.id, type: "sort", prompt: item.prompt, buckets: item.buckets, entries: seededShuffle(item.entries.map((e) => e.text), s) };
    case "sequence":
      return { id: item.id, type: "sequence", prompt: item.prompt, steps: seededShuffle(item.steps, s) };
    case "dictation":
      // Audio is addressed by an opaque hash so the payload never contains the word itself.
      // The spell key lets the Star Catch game check letters without the word in the page.
      return { id: item.id, type: "dictation", audioId: dictationAudioId(item.id), spell: spellKey(item.id, item.word) };
    case "open":
      return { id: item.id, type: "open", question: item.question, context: item.context };
    case "rewrite":
      return { id: item.id, type: "rewrite", prompt: item.prompt, original: item.original, starter: item.starter };
    case "proofread":
      return { id: item.id, type: "proofread", prompt: item.prompt, text: item.text };
  }
}

/** File-name slug for a spoken word ("Saturday" -> "saturday", "to nurse" -> "to-nurse"). */
export function audioSlug(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Opaque, stable audio id for a dictation item (files: /audio/dictation/<id>-w.mp3 and -s.mp3). */
export function dictationAudioId(itemId: string): string {
  return hashString("dictation:" + itemId).toString(36) + hashString(itemId + ":v1").toString(36);
}
