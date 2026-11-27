import { expect, test, type Locator, type Page } from "@playwright/test";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import type { Item } from "@/lib/content/schema";

/**
 * The lane-runner game: multiple-choice questions are played by steering Nova into the gate
 * of the right answer. Right gates burst open and the next question starts by itself; a
 * wrong gate cracks, Nova tumbles, and the usual feedback explains the answer.
 * Set SHOTS_DIR to save screenshots.
 */
test.use({ extraHTTPHeaders: { "x-forwarded-for": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

const LESSON = "gr-stative";
const mcqs = buildCatalog(units).lessonById.get(LESSON)!.lesson.items.filter((i): i is Extract<Item, { type: "mcq" }> => i.type === "mcq");

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS_DIR) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${process.env.SHOTS_DIR}/${test.info().project.name}-${name}.png` });
}

async function dismissCelebrations(page: Page) {
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(400);
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog.getByRole("button").click({ timeout: 3000 }).catch(() => undefined);
  }
}

/** Waits for the runner to move on from a question, closing any celebration on the way. */
async function nextQuestion(page: Page, from: string) {
  const runner = page.getByRole("region", { name: "Answer runner" });
  for (let i = 0; i < 40; i++) {
    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible().catch(() => false)) await dialog.getByRole("button").click({ timeout: 3000 }).catch(() => undefined);
    const id = await runner.getAttribute("data-item", { timeout: 1000 }).catch(() => null);
    if (id && id !== from) return;
    await page.waitForTimeout(300);
  }
  throw new Error(`the runner did not move on from ${from}`);
}

/** Presses a (visually hidden) screen-reader button with the keyboard. */
async function press(button: Locator) {
  await button.focus({ timeout: 15_000 });
  await button.press("Enter");
}

async function signIn(page: Page) {
  const email = `r${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/parent/signup");
  await page.fill('input[name="name"]', "Dana");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button:has-text("Create account")');
  await page.waitForURL("**/parent");
  await page.click("text=+ Add a student");
  await page.fill('input[name="name"]', "Rotem");
  await page.fill('input[name="pin"]', "1357");
  await page.click('button:has-text("Add student")');
  await expect(page.getByRole("heading", { name: "Rotem" })).toBeVisible();
  const code = (await page.locator(".font-mono").first().innerText()).trim();
  await page.click("text=Sign out");
  await page.goto("/join");
  await page.fill("#code", code);
  await page.click("text=Continue");
  for (const d of "1357") await page.click(`button:text-is("${d}")`);
  await page.waitForURL("**/home");
}

/** The current question in the runner, and the lane (0-based) of its right answer. */
async function current(page: Page) {
  const runner = page.getByRole("region", { name: "Answer runner" });
  await expect(runner).toBeVisible({ timeout: 30_000 });
  const id = await runner.getAttribute("data-item");
  const item = mcqs.find((m) => m.id === id)!;
  // Options are shuffled for the student: find the right one by its label.
  const labels = (await runner.locator(".sr-only button").allInnerTexts()).map((t) => t.replace(/^Run through gate \d+: /, "").trim());
  return { id, right: labels.indexOf(item.options[item.answer]), lanes: labels.length };
}

test("multiple-choice questions are played as a lane runner", async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto(`/practice?mode=lesson&lesson=${LESSON}`);
  await expect(page.getByRole("button", { name: /^Game: / })).toBeVisible({ timeout: 30_000 });
  // In development React starts the round twice; let both loads settle before playing.
  await page.waitForLoadState("networkidle");
  // The first three multiple-choice questions are Star Catch (its own spec): catch the right stars.
  for (let i = 0; i < 3; i++) {
    const game = page.getByRole("region", { name: "Star catch" });
    await expect(game).toBeVisible({ timeout: 30_000 });
    const id = (await game.getAttribute("data-item"))!;
    const item = mcqs.find((m) => m.id === id)!;
    await press(game.getByRole("button", { name: `Catch the star: ${item.options[item.answer]}`, exact: true }));
    // Wait for the next question (another star, or the runner), closing any celebration.
    for (let k = 0; k < 50; k++) {
      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible().catch(() => false)) await dialog.getByRole("button").click({ timeout: 3000 }).catch(() => undefined);
      if (await page.getByRole("region", { name: "Answer runner" }).isVisible()) break;
      const now = await page.getByRole("region", { name: "Star catch" }).getAttribute("data-item", { timeout: 500 }).catch(() => null);
      if (now && now !== id) break;
      await page.waitForTimeout(200);
    }
  }
  await shot(page, "r1-start");

  // Steer into the right gate (number key) and run (Enter): the gate bursts open and the
  // next question starts on its own, without the feedback sheet.
  // The runner plays three questions (then it's Star Catch's turn again): two right, one wrong.
  for (let i = 0; i < 2; i++) {
    const q = await current(page);
    // Regression: after tapping a lane button, Enter must not "click" that button again.
    if (i === 1) await page.getByRole("button", { name: "Move down a lane" }).click();
    await page.keyboard.press(String(q.right + 1));
    await expect(page.getByRole("region", { name: "Answer runner" })).toHaveAttribute("data-lane", String(q.right));
    if (i === 1) await shot(page, "r2-steer");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").filter({ hasText: /Correct!|in a row/ })).toBeVisible({ timeout: 15_000 });
    if (i === 1) await shot(page, "r3-correct");
    // The next question starts by itself (a new badge may first pop up a celebration to close).
    await nextQuestion(page, q.id!);
  }

  // A wrong gate: Nova tumbles, then the feedback sheet explains the right answer.
  const q = await current(page);
  const wrong = (q.right + 1) % q.lanes;
  await page.getByRole("button", { name: wrong < q.right ? "Move up a lane" : "Move down a lane" }).click();
  for (let k = 1; k < Math.abs(wrong - q.right); k++) await page.getByRole("button", { name: wrong < q.right ? "Move up a lane" : "Move down a lane" }).click();
  await page.keyboard.press(String(wrong + 1));
  await page.getByRole("button", { name: "Run now" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Oops!" })).toBeVisible({ timeout: 15_000 });
  await shot(page, "r4-oops");
  await expect(page.getByText("Not quite")).toBeVisible({ timeout: 10_000 });
  await shot(page, "r5-feedback");
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCelebrations(page);

  // The games can be switched off: the question shows as a card again.
  await page.getByRole("button", { name: /^Game: / }).click();
  await page.getByRole("menuitemradio", { name: /^Cards/ }).click();
  await expect(page.getByRole("button", { name: "Game: Cards. Choose a game" })).toBeVisible();
  await expect(page.locator("button.choice").first()).toBeVisible();
});

test("the student chooses which mini-game to play", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto(`/practice?mode=lesson&lesson=${LESSON}`);
  const picker = page.getByRole("button", { name: /^Game: / });
  await expect(picker).toHaveAccessibleName("Game: Both. Choose a game", { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  // Both games: the round opens with Star Catch.
  await expect(page.getByRole("region", { name: "Star catch" })).toBeVisible({ timeout: 30_000 });

  // Only the runner: the same question is played as gates instead.
  await picker.click();
  await expect(page.getByRole("menuitemradio", { name: /^Both/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: /^Runner/ }).click();
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(page.getByRole("region", { name: "Answer runner" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Star catch" })).toBeHidden();

  // The choice is remembered on this device.
  await page.reload();
  await expect(picker).toHaveAccessibleName("Game: Runner. Choose a game", { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("region", { name: "Answer runner" })).toBeVisible({ timeout: 30_000 });

  // Only Star Catch; Escape closes the menu without a change.
  await picker.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toBeHidden();
  await picker.click();
  await page.getByRole("menuitemradio", { name: /^Star Catch/ }).click();
  await expect(page.getByRole("region", { name: "Star catch" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Answer runner" })).toBeHidden();
});
