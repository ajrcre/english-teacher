import { expect, test, type Locator, type Page } from "@playwright/test";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";

/**
 * More game modes: typed answers are spelled with falling letters, matching questions are
 * played one definition at a time, and written answers are fought out with a story monster.
 * Set SHOTS_DIR to save screenshots.
 */
test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": `10.8.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
  },
});

const catalog = buildCatalog(units);

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS_DIR) return;
  // Focusing the hidden screen-reader buttons scrolls the page: show the game from the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `${process.env.SHOTS_DIR}/${test.info().project.name}-${name}.png`,
  });
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

const items = new Map(catalog.entries.map((e) => [e.item.id, e.item]));

test("typed answers are spelled with falling letters", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto(`/practice?mode=lesson&lesson=gr-past`);
  const game = page.getByRole("region", { name: "Star catch" });
  await expect(game).toHaveAttribute("data-mode", "spell", { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  const id = (await game.getAttribute("data-item"))!;
  const item = items.get(id)!;
  if (item.type !== "typed") throw new Error("expected a typed question");
  const word = item.answers[0].toLowerCase().replace(/[^a-z]/g, "");
  await shot(page, "t1-typed");
  for (const [i, ch] of [...word].entries()) {
    await press(game.getByRole("button", { name: `Catch letter ${ch}`, exact: true }).first());
    if (i === 1) await shot(page, "t2-typed-letters");
  }
  await expect(page.getByRole("status").filter({ hasText: /Correct!|in a row/ })).toBeVisible({ timeout: 15_000 });
});

test("matching is played one definition at a time", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto(`/practice?mode=lesson&lesson=giver-sameness`);
  const game = page.getByRole("region", { name: "Star catch" });
  await expect(game).toHaveAttribute("data-mode", "match", { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  const id = (await game.getAttribute("data-item"))!;
  const item = items.get(id)!;
  if (item.type !== "match") throw new Error("expected a matching question");
  await shot(page, "m1-match");
  for (let k = 0; k < item.pairs.length; k++) {
    const clue = (await game.locator("[data-clue]").innerText()).trim();
    const pair = item.pairs.find((p) => p[0] === clue || p[1] === clue)!;
    const word = pair[0] === clue ? pair[1] : pair[0];
    await press(game.getByRole("button", { name: `Catch the star: ${word}`, exact: true }));
    if (k === 0) await shot(page, "m2-match-next");
    if (k < item.pairs.length - 1) await expect(game.locator("[data-clue]")).not.toHaveText(clue);
  }
  await expect(page.getByRole("status").filter({ hasText: /Correct!|in a row/ })).toBeVisible({ timeout: 15_000 });
});

test("written answers are fought out with the story monster", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await page.goto(`/practice?mode=lesson&lesson=giver-ch5`);
  const arena = page.getByRole("region", { name: /^Story monster/ });
  await expect(arena).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await shot(page, "o1-monster");
  await page.locator("textarea").first().fill("Jonas dreamed about Fiona and wanted her to take a bath; the Stirrings began.");
  await page.getByRole("button", { name: "Check answer" }).click();
  // Without the AI checker the answer is checked by rules, or the student compares it with the
  // model answer ("Yes, it did"). Either way the monster reacts: a strike, or it dodges.
  const selfCheck = page.getByRole("button", { name: "Yes, it did" });
  await expect(selfCheck.or(page.getByRole("button", { name: "Continue" }))).toBeVisible({ timeout: 15_000 });
  if (await selfCheck.isVisible()) await selfCheck.click();
  await expect(arena).toContainText(/Nova strikes|glancing blow|flees|dodges/, { timeout: 15_000 });
  await shot(page, "o2-monster-hit");
});
