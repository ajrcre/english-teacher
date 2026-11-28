import { expect, test, type Page } from "@playwright/test";
import { giverVocab3to4 } from "@/content/units/theGiverVocab";

/** Close any celebration (badge / level-up) dialogs that are open. */
async function dismissCelebrations(page: Page) {
  for (let i = 0; i < 4; i++) {
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) return;
    // The dialog may already be animating away; don't wait on a disappearing element.
    await dialog.getByRole("button").click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
}

/** Sentence text as it reads on screen: blanks and bold markers dropped, spaces collapsed. */
const normalise = (s: string) => s.replace(/_{3,}/g, " ").replace(/\*\*/g, "").replace(/\s+/g, " ").trim();

/** Correct option for each cloze sentence in the "giver-ch3-4-vocab" lesson. */
const rightAnswer = new Map(
  giverVocab3to4.flatMap((it) => (it.type === "mcq" && it.sentence ? [[normalise(it.sentence), it.options[it.answer]] as const] : [])),
);

/**
 * The question card that is waiting for an answer. The previous card stays in the DOM
 * (with disabled choices) while it animates out, so never read from a plain "section".
 */
function liveCard(page: Page) {
  return page.locator("section", { has: page.locator("button.choice:not([disabled])") });
}

async function liveQuestion(page: Page) {
  const card = liveCard(page);
  await expect(card).toBeVisible();
  const sentence = normalise(await card.locator("p").nth(1).innerText());
  const secondChance = (await card.getByText("Second chance").count()) > 0;
  return { sentence, secondChance };
}

/** Answers the live cloze question right or wrong on purpose, then moves on. */
async function answerAndContinue(page: Page, sentence: string, correct: boolean) {
  const right = rightAnswer.get(sentence);
  if (!right) throw new Error(`No answer key for "${sentence}" in giverVocab3to4`);
  const choices = liveCard(page).locator("button.choice:not([disabled])");
  const rightOption = page.getByText(right, { exact: true });
  const pick = correct ? choices.filter({ has: rightOption }) : choices.filter({ hasNot: rightOption }).first();
  await pick.click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("status").getByText("Not quite")).toHaveCount(correct ? 0 : 1);
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCelebrations(page);
}

/** Each test creates its own family so tests are independent. */
async function setupFamily(page: Page) {
  // Signups are rate-limited per client IP (10 an hour); give each test its own address
  // so repeated runs (e.g. --repeat-each) don't trip the limiter.
  const ip = `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${1 + Math.floor(Math.random() * 254)}`;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": ip });
  const email = `p${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/parent/signup");
  await page.fill('input[name="name"]', "Dana");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button:has-text("Create account")');
  await page.waitForURL("**/parent");
  await page.click("text=+ Add a student");
  await page.fill('input[name="name"]', "Maya");
  await page.fill('input[name="pin"]', "2468");
  await page.selectOption('select[name="focusUnit"]', "the-giver");
  await page.click('button:has-text("Add student")');
  await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
  const code = (await page.locator(".font-mono").first().innerText()).trim();
  return { code };
}

test("student signs in with family code and PIN, practises, and the mistake comes back", async ({ page }) => {
  const { code } = await setupFamily(page);
  await page.click("text=Sign out");
  await page.waitForURL("**/");

  await page.goto("/join");
  await page.fill("#code", code);
  await page.click("text=Continue");
  await expect(page.getByText("Hi, Maya!")).toBeVisible();
  for (const d of "2468") await page.click(`button:text-is("${d}")`);
  await page.waitForURL("**/home");
  await expect(page.getByText("Today's mission")).toBeVisible();

  // Lesson with multiple-choice fill-ins (Chapters 3–4 words).
  await page.goto("/practice?mode=lesson&lesson=giver-ch3-4-vocab");
  const check = page.getByRole("button", { name: "Check answer" });
  await expect(check).toBeDisabled();

  // No hint, answer or feedback is visible before answering.
  await expect(page.getByText("The answer")).toHaveCount(0);
  await expect(page.getByText("Correct!")).toHaveCount(0);

  // Get the first question wrong on purpose, then answer the rest correctly (so no other
  // retries are queued) until the missed one comes back as a "Second chance".
  const first = await liveQuestion(page);
  await answerAndContinue(page, first.sentence, false);
  let seenAgain = false;
  // The retry is always queued before the end of the round, so keep going until it shows
  // up or the round ends. The cap only guards against an endless loop.
  for (let i = 0; i < 25 && !seenAgain; i++) {
    const card = liveCard(page);
    const roundOver = page.getByText("Round complete");
    await expect(card.or(roundOver)).toBeVisible();
    if (await roundOver.isVisible()) break;
    const q = await liveQuestion(page);
    if (q.sentence === first.sentence && q.secondChance) seenAgain = true;
    else await answerAndContinue(page, q.sentence, true);
  }
  expect(seenAgain).toBe(true);
});

test("parent dashboard shows the family code and student progress", async ({ page }) => {
  await setupFamily(page);
  await expect(page.getByText("Family code")).toBeVisible();
  await page.getByRole("button", { name: "Copy family code" }).click();
  await expect(page.getByRole("button", { name: "Family code copied" })).toBeVisible();
  await expect(page.getByText("Mastery by unit")).toBeVisible();
  await page.click("text=Review answer keys");
  await expect(page.getByRole("heading", { name: "Review answer keys" })).toBeVisible();
  await page.getByRole("button", { name: "Looks right" }).first().click();
  await expect(page.getByRole("button", { name: "✓ Looks right" }).first()).toBeVisible();
});

test("spelling dictation plays audio and accepts typed spelling", async ({ page }) => {
  await setupFamily(page);
  await page.getByRole("button", { name: /Start practice as Maya/ }).click();
  await page.waitForURL("**/home");
  await page.goto("/practice?mode=lesson&lesson=spelling-test-1");
  await expect(page.getByRole("button", { name: /Hear the word/ })).toBeVisible();
  await page.getByLabel("Your answer").fill("manage");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("status")).toBeVisible();
});
