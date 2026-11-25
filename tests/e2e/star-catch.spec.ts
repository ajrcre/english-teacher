import { expect, test, type Locator, type Page } from "@playwright/test";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import type { Item } from "@/lib/content/schema";

/**
 * Star Catch: multiple-choice answers fall as stars and Nova catches the right one in her
 * basket; spelling words are played by catching their letters in order. The first three
 * multiple-choice questions of a round are Star Catch, the next three the lane runner.
 * Set SHOTS_DIR to save screenshots.
 */
test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
  },
});

const LESSON = "gr-stative";
const SPELLING = "spelling-test-1";
const catalog = buildCatalog(units);
const mcqs = catalog.lessonById
  .get(LESSON)!
  .lesson.items.filter(
    (i): i is Extract<Item, { type: "mcq" }> => i.type === "mcq",
  );
const words = new Map(
  catalog.lessonById
    .get(SPELLING)!
    .lesson.items.flatMap((i) =>
      i.type === "dictation" ? [[i.id, i.word.toLowerCase()] as const] : [],
    ),
);

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS_DIR) return;
  // Focusing the hidden screen-reader buttons scrolls the page: show the game from the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `${process.env.SHOTS_DIR}/${test.info().project.name}-${name}.png`,
  });
}

async function dismissCelebrations(page: Page) {
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(400);
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog
      .getByRole("button")
      .click({ timeout: 3000 })
      .catch(() => undefined);
  }
}

/** Waits for the game to move on from a question, closing any celebration on the way. */
async function nextQuestion(page: Page, from: string) {
  const game = page.getByRole("region", { name: "Star catch" });
  for (let i = 0; i < 40; i++) {
    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible().catch(() => false))
      await dialog
        .getByRole("button")
        .click({ timeout: 3000 })
        .catch(() => undefined);
    const id = await game
      .getAttribute("data-item", { timeout: 1000 })
      .catch(() => null);
    if (id && id !== from) return;
    await page.waitForTimeout(300);
  }
  throw new Error(`the game did not move on from ${from}`);
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

/** The current multiple-choice question in Star Catch, and the star (0-based) of its right answer. */
async function current(page: Page) {
  const game = page.getByRole("region", { name: "Star catch" });
  await expect(game).toBeVisible({ timeout: 30_000 });
  await expect(game).toHaveAttribute("data-mode", "choice");
  const id = await game.getAttribute("data-item");
  const item = mcqs.find((m) => m.id === id)!;
  // Answers are shuffled for the student: find the right one by its label.
  const buttons = game.locator(".sr-only button");
  await expect(buttons.first()).toBeAttached();
  const labels = (await buttons.allInnerTexts()).map((t) =>
    t.replace(/^Catch the star: /, "").trim(),
  );
  return { id, right: labels.indexOf(item.options[item.answer]), labels, options: item.options.length };
}

test("multiple-choice answers fall as stars and Nova catches the right one", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto(`/practice?mode=lesson&lesson=${LESSON}`);
  await expect(page.getByRole("button", { name: "🎮 Game" })).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle");
  await shot(page, "s1-start");

  // Run under the right star (number key) and drop the stars (hold ↓) until it lands in the basket.
  for (let i = 0; i < 2; i++) {
    const q = await current(page);
    // Two-answer questions get a third star: a word borrowed from another question.
    expect(q.labels.length).toBe(Math.max(3, q.options));
    await page.keyboard.press(String(q.right + 1));
    await page.waitForTimeout(900);
    if (i === 0) await shot(page, "s2-aim");
    await page.keyboard.down("ArrowDown");
    await expect(
      page.getByRole("status").filter({ hasText: /Correct!|in a row/ }),
    ).toBeVisible({ timeout: 20_000 });
    await page.keyboard.up("ArrowDown");
    if (i === 0) await shot(page, "s3-correct");
    await nextQuestion(page, q.id!);
  }

  // A wrong star (screen-reader button): it cracks, the right one glows, then the feedback.
  const q = await current(page);
  const wrong = (q.right + 1) % q.labels.length;
  await press(
    page.getByRole("button", {
      name: `Catch the star: ${q.labels[wrong]}`,
      exact: true,
    }),
  );
  await expect(
    page.getByRole("status").filter({ hasText: "Oops!" }),
  ).toBeVisible({ timeout: 15_000 });
  await shot(page, "s4-oops");
  await expect(page.getByText("Not quite")).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCelebrations(page);

  // After three Star Catch questions come three in the lane runner.
  await expect(page.getByRole("region", { name: "Answer runner" })).toBeVisible(
    { timeout: 15_000 },
  );
});

test("spelling words are played by catching their letters", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto(`/practice?mode=lesson&lesson=${SPELLING}`);
  const game = page.getByRole("region", { name: "Star catch" });
  await expect(game).toHaveAttribute("data-mode", "spell", { timeout: 30_000 });
  await page.waitForLoadState("networkidle");

  // Catch the letters in order: the slots fill, and the word is sent and marked right.
  const id = (await game.getAttribute("data-item"))!;
  const word = words.get(id)!;
  for (const [i, ch] of [...word].entries()) {
    await press(
      game
        .getByRole("button", { name: `Catch letter ${ch}`, exact: true })
        .first(),
    );
    await expect(game.getByLabel(/^Spelled so far/)).toHaveAttribute(
      "aria-label",
      new RegExp(`^Spelled so far: ${[...word.slice(0, i + 1)].join(" ")}\.`),
    );
    if (i === 1) await shot(page, "w1-spelling");
  }
  await expect(
    page.getByRole("status").filter({ hasText: /Correct!|in a row/ }),
  ).toBeVisible({ timeout: 15_000 });
  await nextQuestion(page, id);

  // Three wrong letters cost three hearts, and the word comes back as a mistake.
  const id2 = (await game.getAttribute("data-item"))!;
  const right = words.get(id2)![0];
  for (let k = 0; k < 3; k++) {
    const wrong = game
      .locator(".sr-only button")
      .filter({ hasNotText: new RegExp(`^Catch letter ${right}$`) })
      .first();
    await press(wrong);
    if (k < 2)
      await expect(
        game.getByLabel(k === 0 ? "2 hearts left" : "1 heart left"),
      ).toBeVisible();
  }
  await expect(
    page.getByRole("status").filter({ hasText: "Oops!" }),
  ).toBeVisible({ timeout: 15_000 });
  await shot(page, "w2-oops");
  await expect(page.getByText(/It is spelled/)).toBeVisible({
    timeout: 10_000,
  });
  await shot(page, "w3-feedback");
});
