import type { ItemInput, UnitInput } from "@/lib/content/schema";
import entries from "../data/spelling.json";

interface SpellingEntry {
  test: number;
  word: string;
  sentence: string;
  he: string;
}

const byTest = new Map<number, SpellingEntry[]>();
for (const e of entries as SpellingEntry[]) {
  byTest.set(e.test, [...(byTest.get(e.test) ?? []), e]);
}

export const spelling: UnitInput = {
  id: "spelling",
  title: "Spelling Bee",
  tagline: "Listen, then spell every word on the spelling list",
  note: "Turn your sound on. You'll hear each word and a sentence, then type the word. The spelling must be exactly right.",
  accent: "lime",
  lessons: [...byTest.entries()].map(([test, words]) => ({
    id: `spelling-test-${test}`,
    title: `Spelling Test ${test}`,
    subtitle: words.slice(0, 4).map((w) => w.word).join(", ") + " …",
    source: "Workbook pp. 171–174",
    items: words.map(
      (w, i): ItemInput => ({
        // Ids must not contain the word: they are sent to the browser before answering.
        id: `spell.t${test}.w${i + 1}`,
        type: "dictation",
        word: w.word,
        sentence: w.sentence,
        he: `${w.word} = ${w.he}`,
        speak: w.word,
        source: `Spelling list, test ${test}`,
        explanation: w.sentence,
      }),
    ),
  })),
};
