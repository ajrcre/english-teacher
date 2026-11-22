import { describe, expect, it } from "vitest";
import type { Item } from "@/lib/content/schema";
import { itemSchema } from "@/lib/content/schema";
import { GraderRegistry } from "@/lib/grading/registry";
import type { LlmClient, LlmGradeRequest } from "@/lib/grading/llm/types";
import { LlmUnavailableError } from "@/lib/grading/llm/types";
import { GraderUnavailableError } from "@/lib/grading/graders/llmGraders";

const item = (raw: unknown) => itemSchema.parse(raw) as Item;

class FakeLlm implements LlmClient {
  readonly name = "fake";
  calls: LlmGradeRequest[] = [];
  constructor(private readonly behavior: "correct" | "fail" = "correct") {}
  async grade(req: LlmGradeRequest) {
    this.calls.push(req);
    if (this.behavior === "fail") throw new LlmUnavailableError("rate limited", true);
    return { verdict: "correct" as const, score: 1, feedback_en: "Good answer.", feedback_he: "תשובה טובה.", language_notes: ["becaus -> because"] };
  }
}

describe("rule-based graders", () => {
  const reg = new GraderRegistry(() => null);

  it("grades multiple choice by option text", async () => {
    const q = item({ id: "q1", type: "mcq", prompt: "?", options: ["a", "b", "c"], answer: 1 });
    expect((await reg.grade(q, { type: "mcq", choice: "b" })).verdict).toBe("correct");
    const wrong = await reg.grade(q, { type: "mcq", choice: "a" });
    expect(wrong.verdict).toBe("incorrect");
    expect(wrong.modelAnswer).toBe("b");
  });

  it("accepts alternatives, ignores case/punctuation and tolerates a one-letter slip", async () => {
    const q = item({ id: "t1", type: "typed", prompt: "?", answers: ["is cheering", "'s cheering"] });
    expect((await reg.grade(q, { type: "typed", text: "  Is Cheering. " })).verdict).toBe("correct");
    const slip = await reg.grade(q, { type: "typed", text: "is cheerin" });
    expect(slip.verdict).toBe("correct");
    expect(slip.notes[0]).toMatch(/Spelling/);
    expect((await reg.grade(q, { type: "typed", text: "cheers" })).verdict).toBe("incorrect");
  });

  it("does not tolerate slips when allowTypo is false", async () => {
    const q = item({ id: "t2", type: "typed", prompt: "?", answers: ["brought"], allowTypo: false });
    expect((await reg.grade(q, { type: "typed", text: "brougt" })).verdict).toBe("incorrect");
  });

  it("requires exact spelling in dictation but only notes capital letters", async () => {
    const q = item({ id: "d1", type: "dictation", word: "Saturday", sentence: "We play on Saturday." });
    expect((await reg.grade(q, { type: "dictation", text: "Saturdy" })).verdict).toBe("incorrect");
    const lower = await reg.grade(q, { type: "dictation", text: "saturday" });
    expect(lower.verdict).toBe("correct");
    expect(lower.notes.join(" ")).toMatch(/capital/);
  });

  it("scores matching by fraction and lists wrong pairs", async () => {
    const q = item({ id: "m1", type: "match", prompt: "?", pairs: [["a", "1"], ["b", "2"], ["c", "3"], ["d", "4"]] });
    const all = await reg.grade(q, { type: "match", pairs: [["a", "1"], ["b", "2"], ["c", "3"], ["d", "4"]] });
    expect(all.verdict).toBe("correct");
    const half = await reg.grade(q, { type: "match", pairs: [["a", "1"], ["b", "2"], ["c", "4"], ["d", "3"]] });
    expect(half.verdict).toBe("partial");
    expect(half.details).toMatchObject({ kind: "pairs", wrongLeft: ["c", "d"] });
  });

  it("grades sort and sequence", async () => {
    const s = item({ id: "s1", type: "sort", prompt: "?", buckets: ["x", "y"], entries: [{ text: "a", bucket: "x" }, { text: "b", bucket: "y" }] });
    expect((await reg.grade(s, { type: "sort", placement: { a: "x", b: "y" } })).verdict).toBe("correct");
    expect((await reg.grade(s, { type: "sort", placement: { a: "y", b: "x" } })).verdict).toBe("incorrect");
    const seq = item({ id: "q", type: "sequence", prompt: "?", steps: ["1", "2", "3"] });
    expect((await reg.grade(seq, { type: "sequence", order: ["1", "2", "3"] })).verdict).toBe("correct");
    expect((await reg.grade(seq, { type: "sequence", order: ["2", "1", "3"] })).verdict).toBe("incorrect");
  });
});

describe("LLM-backed graders", () => {
  const open = item({ id: "o1", type: "open", question: "Why?", expected: "Because.", keyPoints: ["because"] });

  it("calls the model and maps its reply", async () => {
    const llm = new FakeLlm();
    const res = await new GraderRegistry(() => llm).grade(open, { type: "open", text: "becaus of the war" });
    expect(res.verdict).toBe("correct");
    expect(res.byLlm).toBe(true);
    expect(res.feedbackHe).toBeTruthy();
    expect(res.notes).toEqual(["becaus -> because"]);
    expect(llm.calls[0].studentAnswer).toBe("becaus of the war");
  });

  it("does not call the model for empty answers", async () => {
    const llm = new FakeLlm();
    const res = await new GraderRegistry(() => llm).grade(open, { type: "open", text: " " });
    expect(res.verdict).toBe("incorrect");
    expect(llm.calls).toHaveLength(0);
  });

  it("short-circuits exact rewrite answers", async () => {
    const llm = new FakeLlm();
    const rw = item({ id: "r1", type: "rewrite", prompt: "Rewrite", original: "x", answers: ["Miri is shorter than Amir."] });
    const res = await new GraderRegistry(() => llm).grade(rw, { type: "rewrite", text: "miri is shorter than amir" });
    expect(res.verdict).toBe("correct");
    expect(llm.calls).toHaveLength(0);
  });

  it("reports unchanged proofreading text as incorrect without the model", async () => {
    const llm = new FakeLlm();
    const pr = item({ id: "p1", type: "proofread", prompt: "Fix", text: "i am here", expected: "I am here", keyFixes: ["I"] });
    expect((await new GraderRegistry(() => llm).grade(pr, { type: "proofread", text: "i am here" })).verdict).toBe("incorrect");
    expect((await new GraderRegistry(() => llm).grade(pr, { type: "proofread", text: "I am here" })).verdict).toBe("correct");
    expect(llm.calls).toHaveLength(0);
  });

  it("raises GraderUnavailableError when the provider fails or is missing", async () => {
    await expect(new GraderRegistry(() => new FakeLlm("fail")).grade(open, { type: "open", text: "an answer" })).rejects.toBeInstanceOf(GraderUnavailableError);
    await expect(new GraderRegistry(() => null).grade(open, { type: "open", text: "an answer" })).rejects.toBeInstanceOf(GraderUnavailableError);
  });
});
