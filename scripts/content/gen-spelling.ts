/**
 * Builds content/data/spelling.json: for every spelling word, a short dictation
 * sentence and a Hebrew gloss (shown only after the student answers).
 * Uses Gemini (GEMINI_API_KEY). Re-running keeps entries that already exist.
 *   npx tsx scripts/content/gen-spelling.ts
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

interface Entry {
  test: number;
  word: string;
  sentence: string;
  he: string;
}

const WORDS = "content/data/spelling-words.json";
const OUT = "content/data/spelling.json";
const MODEL = process.env.GEMINI_CONTENT_MODEL ?? "gemini-3.5-flash";

const schema = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: { word: { type: "string" }, sentence: { type: "string" }, he: { type: "string" } },
        required: ["word", "sentence", "he"],
      },
    },
  },
  required: ["entries"],
};

const PROMPT = `You write dictation sentences for a spelling test for a 12-year-old in Israel who is learning English.
For each word:
- "sentence": ONE short, natural sentence (6-12 words) that contains the exact word as written (same spelling and form), with clear context so a listener can tell which word it is. Use everyday, kind, school-appropriate topics. If a word has an old-fashioned or offensive meaning, use its neutral meaning (e.g. "cripple" as a verb about damage, "queer" meaning strange).
- "he": a short Hebrew translation of the word as used in your sentence (1-4 words).
Return the words in the same order, unchanged.`;

function containsWord(sentence: string, word: string): boolean {
  const re = new RegExp(`(^|[^A-Za-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^A-Za-z]|$)`, "i");
  return re.test(sentence);
}

async function main(): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey: key });
  const tests: Record<string, string[]> = JSON.parse(readFileSync(WORDS, "utf8"));
  const existing: Entry[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : [];
  const have = new Map(existing.map((e) => [`${e.test}:${e.word}`, e]));
  const out: Entry[] = [];

  for (const [testKey, words] of Object.entries(tests)) {
    const test = Number(testKey);
    let missing = words.filter((w) => !have.has(`${test}:${w}`));
    for (let attempt = 1; missing.length && attempt <= 3; attempt++) {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: `${PROMPT}\n\nWords:\n${missing.join("\n")}`,
        config: { responseMimeType: "application/json", responseJsonSchema: schema },
      });
      const parsed = JSON.parse(res.text ?? "{}") as { entries?: { word: string; sentence: string; he: string }[] };
      for (const e of parsed.entries ?? []) {
        const word = missing.find((w) => w === e.word.trim());
        if (word && containsWord(e.sentence, word)) have.set(`${test}:${word}`, { test, word, sentence: e.sentence.trim(), he: e.he.trim() });
      }
      missing = words.filter((w) => !have.has(`${test}:${w}`));
      if (missing.length) console.log(`test ${test}: retrying ${missing.length} words`);
    }
    if (missing.length) console.warn(`test ${test}: could not generate`, missing);
    for (const w of words) {
      const e = have.get(`${test}:${w}`);
      if (e) out.push(e);
    }
    console.log(`test ${test}: ${words.length - missing.length}/${words.length}`);
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(`wrote ${out.length} entries to ${OUT}`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
