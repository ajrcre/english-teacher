/**
 * Class tests: which parts of the workbook a test covers. A student can have one test switched on
 * ("test prep"); until the test day, rounds then use only these questions.
 *
 * A rule names a lesson and, optionally, a workbook page range: only questions whose source page
 * falls in the range are included (e.g. just pages 139–142 of a lesson that runs to page 144).
 */
export interface TestRule {
  lessonId: string;
  /** Inclusive workbook page range. Omit to take the whole lesson. */
  pages?: readonly [number, number];
}

export interface TestDef {
  id: string;
  title: string;
  /** Test day (YYYY-MM-DD). Test prep switches itself off after this day. */
  date: string;
  rules: readonly TestRule[];
  /** Topics on the test that the app has no practice for. Shown so nobody assumes they are covered. */
  notInApp: readonly string[];
}

export const tests: readonly TestDef[] = [
  {
    id: "year7-test-2",
    title: "Test 2",
    date: "2026-11-29",
    rules: [
      { lessonId: "gr-capitals" }, // 1. Punctuation, workbook pp. 133–136 (the lesson covers 133–135)
      { lessonId: "nts-vocab", pages: [15, 16] }, // 2. Vocabulary, pp. 15 and 16 (p. 16 is the next lesson)
      { lessonId: "nts-ame-bre" }, // 2./3. American vs British English, p. 16
      { lessonId: "gr-present", pages: [139, 142] }, // 3. Present Simple and Progressive, pp. 139–142
      { lessonId: "gr-stative" }, // p. 140: stative verbs belong to the same pages
      { lessonId: "nts-rescue" }, // 4. Number the Stars: background reading, pp. 5–7
      { lessonId: "nts-ch1-4" }, // 4. Number the Stars: chapters 1–3 quiz, p. 8
    ],
    notInApp: ["Unseen (reading a new text)", "Writing"],
  },
];

export const testById = (id: string): TestDef | undefined => tests.find((t) => t.id === id);
