import type { ItemResponse } from "@/lib/content/client";
import { levenshtein, normalize } from "../text";
import { ResponseMismatchError, type GradeResult, type GraderFor, type Verdict } from "../types";

function expect<T extends ItemResponse["type"]>(response: ItemResponse, type: T): Extract<ItemResponse, { type: T }> {
  if (response.type !== type) throw new ResponseMismatchError(type, response.type);
  return response as Extract<ItemResponse, { type: T }>;
}

function fractionVerdict(score: number): Verdict {
  if (score >= 0.999) return "correct";
  return score >= 0.5 ? "partial" : "incorrect";
}

const RIGHT = ["Well done!", "Exactly right.", "Correct!", "Spot on.", "Great work."];
const praise = (seed: string) => RIGHT[seed.length % RIGHT.length];

export const mcqGrader: GraderFor<"mcq"> = {
  async grade(item, response) {
    const { choice } = expect(response, "mcq");
    const right = item.options[item.answer];
    const ok = normalize(choice) === normalize(right);
    return {
      verdict: ok ? "correct" : "incorrect",
      score: ok ? 1 : 0,
      feedback: ok ? praise(item.id) : `The answer is “${right}”.`,
      modelAnswer: right,
      notes: [],
    };
  },
};

/** Typed answers: several accepted forms; a one-letter slip counts, with a note. */
export const typedGrader: GraderFor<"typed"> = {
  async grade(item, response) {
    const { text } = expect(response, "typed");
    const given = normalize(text);
    const model = item.answers[0];
    if (!given) {
      return { verdict: "incorrect", score: 0, feedback: `The answer is “${model}”.`, modelAnswer: model, notes: [] };
    }
    if (item.answers.some((a) => normalize(a) === given)) {
      return { verdict: "correct", score: 1, feedback: praise(item.id), modelAnswer: model, notes: [] };
    }
    if (item.allowTypo) {
      const near = item.answers.find((a) => {
        const n = normalize(a);
        return n.length >= 4 && levenshtein(n, given) === 1;
      });
      if (near) {
        return {
          verdict: "correct",
          score: 1,
          feedback: "Correct — just check the spelling.",
          modelAnswer: near,
          notes: [`Spelling: “${near}” (you wrote “${text.trim()}”).`],
        };
      }
    }
    return { verdict: "incorrect", score: 0, feedback: `The answer is “${model}”.`, modelAnswer: model, notes: [] };
  },
};

/** Spelling dictation: the letters must be exactly right. Capital letters only earn a note. */
export const dictationGrader: GraderFor<"dictation"> = {
  async grade(item, response) {
    const { text } = expect(response, "dictation");
    const typed = text.trim();
    const ok = typed.toLowerCase() === item.word.toLowerCase();
    const notes: string[] = [];
    if (ok && typed !== item.word && /^[A-Z]/.test(item.word)) {
      notes.push(`“${item.word}” starts with a capital letter.`);
    }
    if (!ok && typed) {
      const d = levenshtein(typed.toLowerCase(), item.word.toLowerCase());
      if (d <= 2) notes.push("So close — compare your letters with the correct spelling.");
    }
    return {
      verdict: ok ? "correct" : "incorrect",
      score: ok ? 1 : 0,
      feedback: ok ? praise(item.id) : `It is spelled “${item.word}”.`,
      modelAnswer: item.word,
      notes,
    };
  },
};

export const matchGrader: GraderFor<"match"> = {
  async grade(item, response) {
    const { pairs } = expect(response, "match");
    const key = new Map(item.pairs.map(([l, r]) => [normalize(l), normalize(r)]));
    const wrongLeft: string[] = [];
    let right = 0;
    const answered = new Map(pairs.map(([l, r]) => [normalize(l), normalize(r)]));
    for (const [l] of item.pairs) {
      if (answered.get(normalize(l)) === key.get(normalize(l))) right++;
      else wrongLeft.push(l);
    }
    const score = right / item.pairs.length;
    const verdict = fractionVerdict(score);
    return {
      verdict,
      score,
      feedback: verdict === "correct" ? praise(item.id) : `${right} of ${item.pairs.length} pairs were right.`,
      modelAnswer: item.pairs.map(([l, r]) => `${l} → ${r}`).join("\n"),
      notes: [],
      details: { kind: "pairs", correctPairs: item.pairs.map((p) => [p[0], p[1]] as [string, string]), wrongLeft },
    };
  },
};

export const sortGrader: GraderFor<"sort"> = {
  async grade(item, response) {
    const { placement } = expect(response, "sort");
    const placed = new Map(Object.entries(placement).map(([t, b]) => [normalize(t), b]));
    const wrong: string[] = [];
    for (const e of item.entries) {
      if (placed.get(normalize(e.text)) !== e.bucket) wrong.push(e.text);
    }
    const score = (item.entries.length - wrong.length) / item.entries.length;
    const verdict = fractionVerdict(score);
    return {
      verdict,
      score,
      feedback: verdict === "correct" ? praise(item.id) : `${item.entries.length - wrong.length} of ${item.entries.length} were in the right group.`,
      modelAnswer: item.buckets.map((b) => `${b}: ${item.entries.filter((e) => e.bucket === b).map((e) => e.text).join(", ")}`).join("\n"),
      notes: [],
      details: { kind: "buckets", correct: Object.fromEntries(item.entries.map((e) => [e.text, e.bucket])), wrong },
    };
  },
};

export const sequenceGrader: GraderFor<"sequence"> = {
  async grade(item, response) {
    const { order } = expect(response, "sequence");
    let inPlace = 0;
    item.steps.forEach((s, i) => {
      if (order[i] !== undefined && normalize(order[i]) === normalize(s)) inPlace++;
    });
    const score = inPlace / item.steps.length;
    const verdict = score >= 0.999 ? "correct" : "incorrect";
    return {
      verdict,
      score,
      feedback: verdict === "correct" ? praise(item.id) : `${inPlace} of ${item.steps.length} events were in the right place.`,
      modelAnswer: item.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
      notes: [],
      details: { kind: "order", correctOrder: item.steps },
    };
  },
};

export function exactOrNull(answers: readonly string[], text: string): string | null {
  const given = normalize(text);
  return answers.find((a) => normalize(a) === given) ?? null;
}

export function emptyAnswer(modelAnswer: string): GradeResult {
  return {
    verdict: "incorrect",
    score: 0,
    feedback: "No answer was given. Have a look at the model answer.",
    modelAnswer,
    notes: [],
  };
}
