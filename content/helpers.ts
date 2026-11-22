import type { ItemInput } from "@/lib/content/schema";

/**
 * Small builders that keep the content files readable. Everything they return is
 * validated by the zod schema at load time (see lib/content/catalog.ts).
 */

type Extra = Partial<Pick<ItemInput, "source" | "explanation" | "he" | "speak" | "difficulty" | "reviewStatus">>;

export interface VocabEntry {
  word: string;
  pos: string;
  def: string;
  he: string;
  /** Example sentence with the target form marked *like this*. */
  example?: string;
}

/**
 * Parses one vocabulary entry per line:
 *   word | pos | simple definition | Hebrew | Example with the *word* marked.
 */
export function parseVocab(block: string): VocabEntry[] {
  return block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((line) => {
      const [word, pos, def, he, example] = line.split("|").map((s) => s.trim());
      if (!word || !pos || !def || !he) throw new Error(`bad vocab line: ${line}`);
      if (example && !/\*[^*]+\*/.test(example)) throw new Error(`example must mark the word with *...*: ${line}`);
      return { word, pos, def, he, example: example || undefined };
    });
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function markedForm(example: string): string {
  return example.match(/\*([^*]+)\*/)![1];
}

function blankOut(example: string): string {
  return example.replace(/\*[^*]+\*/, "___");
}

function pick<T>(list: readonly T[], from: number, count: number, ok: (x: T) => boolean): T[] {
  const out: T[] = [];
  for (let step = 1; step < list.length && out.length < count; step++) {
    const cand = list[(from + step * 3) % list.length];
    if (ok(cand) && !out.includes(cand)) out.push(cand);
  }
  for (let j = 0; j < list.length && out.length < count; j++) {
    const cand = list[j];
    if (j !== from && ok(cand) && !out.includes(cand)) out.push(cand);
  }
  return out;
}

/** Insert the right answer at a position derived from the index (so it isn't always first). */
function withAnswer(right: string, wrong: string[], i: number): { options: string[]; answer: number } {
  const pos = (i * 7 + 1) % (wrong.length + 1);
  const options = [...wrong];
  options.splice(pos, 0, right);
  return { options, answer: pos };
}

/**
 * Turns a vocabulary list into practice items:
 * - one "match the word to its meaning" item per group of 4–5 words;
 * - one multiple-choice item per word, alternating between
 *   "choose the word for the sentence" and "what does this word mean?".
 */
export function vocabItems(prefix: string, entries: VocabEntry[], source?: string): ItemInput[] {
  const items: ItemInput[] = [];
  const groupSize = entries.length % 5 === 1 ? 4 : 5;
  for (let g = 0; g < entries.length; g += groupSize) {
    const group = entries.slice(g, g + groupSize);
    if (group.length < 2) continue;
    items.push({
      id: `${prefix}.match-${g / groupSize + 1}`,
      type: "match",
      prompt: "Match each word to its meaning.",
      pairs: group.map((e) => [e.word, e.def] as [string, string]),
      source,
      he: group.map((e) => `${e.word} = ${e.he}`).join(" · "),
    });
  }
  entries.forEach((e, i) => {
    const id = `${prefix}.${slug(e.word)}`;
    const extra = { source, he: `${e.word} = ${e.he}`, speak: e.word, explanation: `${e.word} (${e.pos}): ${e.def}` };
    if (e.example && i % 2 === 0) {
      const right = markedForm(e.example);
      const others = pick(entries, i, 3, (x) => x !== e && !!x.example).map((x) => markedForm(x.example!));
      const distinct = others.filter((o) => o.toLowerCase() !== right.toLowerCase());
      if (distinct.length >= 2) {
        const { options, answer } = withAnswer(right, distinct.slice(0, 3), i);
        items.push({ id, type: "mcq", prompt: "Choose the word that fits the sentence.", sentence: blankOut(e.example), options, answer, ...extra });
        return;
      }
    }
    const wrong = pick(entries, i, 3, (x) => x !== e && x.def !== e.def).map((x) => x.def);
    const { options, answer } = withAnswer(e.def, wrong, i);
    items.push({
      id,
      type: "mcq",
      prompt: `What does “${e.word}” mean?`,
      sentence: e.example ? e.example.replace(/\*([^*]+)\*/, "**$1**") : undefined,
      options,
      answer,
      ...extra,
    });
  });
  return items;
}

/** Fill-in-the-blank with choices, written as "sentence with ___" + options; `right` is the correct option text. */
export function choice(id: string, sentence: string, options: string[], right: string, extra: Extra & { prompt?: string } = {}): ItemInput {
  const answer = options.indexOf(right);
  if (answer < 0) throw new Error(`${id}: "${right}" is not one of the options`);
  const { prompt, ...rest } = extra;
  return { id, type: "mcq", prompt: prompt ?? "Choose the best word.", sentence, options, answer, ...rest };
}

/** Multiple-choice question; `right` is the correct option text. */
export function mcq(id: string, prompt: string, options: string[], right: string, extra: Extra & { sentence?: string } = {}): ItemInput {
  const answer = options.indexOf(right);
  if (answer < 0) throw new Error(`${id}: "${right}" is not one of the options`);
  return { id, type: "mcq", prompt, options, answer, ...extra };
}

/** Typed short answer. The first answer is the model answer. */
export function typed(id: string, prompt: string, answers: string | string[], extra: Extra & { sentence?: string; allowTypo?: boolean } = {}): ItemInput {
  return { id, type: "typed", prompt, answers: Array.isArray(answers) ? answers : [answers], ...extra };
}

/** Open comprehension question graded against an expected answer and key points. */
export function open(id: string, question: string, expected: string, keyPoints: string[], extra: Extra & { context?: string } = {}): ItemInput {
  return { id, type: "open", question, expected, keyPoints, ...extra };
}

/** Matching exercise. */
export function match(id: string, prompt: string, pairs: [string, string][], extra: Extra = {}): ItemInput {
  return { id, type: "match", prompt, pairs, ...extra };
}

/** Split long matching lists into chunks of `size` pairs. */
export function matchChunks(prefix: string, prompt: string, pairs: [string, string][], size = 5, extra: Extra = {}): ItemInput[] {
  const out: ItemInput[] = [];
  for (let i = 0; i < pairs.length; i += size) {
    let chunk = pairs.slice(i, i + size);
    if (chunk.length === 1 && out.length) {
      // Avoid a one-pair item: fold it into the previous chunk.
      const prev = out[out.length - 1] as Extract<ItemInput, { type: "match" }>;
      prev.pairs.push(chunk[0]);
      continue;
    }
    chunk = chunk.map((p) => [p[0], p[1]]);
    out.push({ id: `${prefix}-${out.length + 1}`, type: "match", prompt, pairs: chunk, ...extra });
  }
  return out;
}

/** Ordering exercise: steps are given in the correct order. */
export function sequence(id: string, prompt: string, steps: string[], extra: Extra = {}): ItemInput {
  return { id, type: "sequence", prompt, steps, ...extra };
}

/** Sorting exercise. `groups` maps bucket name -> entries. */
export function sort(id: string, prompt: string, groups: Record<string, string[]>, extra: Extra = {}): ItemInput {
  return {
    id,
    type: "sort",
    prompt,
    buckets: Object.keys(groups),
    entries: Object.entries(groups).flatMap(([bucket, texts]) => texts.map((text) => ({ text, bucket }))),
    ...extra,
  };
}

/** Sentence transformation. */
export function rewrite(id: string, prompt: string, original: string, answers: string[], extra: Extra & { starter?: string } = {}): ItemInput {
  return { id, type: "rewrite", prompt, original, answers, ...extra };
}

export function proofread(id: string, prompt: string, text: string, expected: string, keyFixes: string[], extra: Extra = {}): ItemInput {
  return { id, type: "proofread", prompt, text, expected, keyFixes, ...extra };
}

/** Verb-form gap: "They ___ (travel) abroad every summer." with accepted answers. */
export function verbGap(id: string, sentence: string, answers: string | string[], extra: Extra & { prompt?: string } = {}): ItemInput {
  const { prompt, ...rest } = extra;
  return {
    id,
    type: "typed",
    prompt: prompt ?? "Write the correct form of the verb.",
    sentence,
    answers: Array.isArray(answers) ? answers : [answers],
    allowTypo: false,
    ...rest,
  };
}

/**
 * Fill-in-the-blank from a word box: the right word plus three other box words as choices.
 * `right` may be an inflected form (e.g. "pleaded"); `base` is the box word it comes from.
 */
export function boxChoice(id: string, sentence: string, box: string[], right: string, extra: Extra & { base?: string; prompt?: string } = {}): ItemInput {
  const { base, prompt, ...rest } = extra;
  const baseWord = base ?? right;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const pool = box.filter((w) => w !== baseWord);
  const wrong: string[] = [];
  for (let k = 0; wrong.length < 3 && k < pool.length * 2; k++) {
    const w = pool[(h + k * 5) % pool.length];
    if (!wrong.includes(w)) wrong.push(w);
  }
  const pos = h % 4;
  const options = [...wrong];
  options.splice(pos, 0, right);
  return { id, type: "mcq", prompt: prompt ?? "Choose the word from the box that fits.", sentence, options, answer: pos, ...rest };
}

/** Crossword-style clue: type the word (the letter count comes from the original crossword). */
export function clue(id: string, clueText: string, answer: string, extra: Extra & { alt?: string[] } = {}): ItemInput {
  const { alt, ...rest } = extra;
  const letters = answer.replace(/[^a-zA-Z]/g, "").length;
  return { id, type: "typed", prompt: `Crossword clue: ${clueText} (${letters} letters)`, answers: [answer, ...(alt ?? [])], ...rest };
}
