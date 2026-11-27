import { expect, test, type Page } from "@playwright/test";
import { tests } from "@/content/tests";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { testItemIds } from "@/lib/content/testScope";
import type { Item } from "@/lib/content/schema";

/**
 * The Grey Fox, the test-prep boss: unlock him by meeting the test's questions, fight him
 * (his questions come in speech bubbles; a wrong answer gets a bubble thrown at Nova), beat
 * him with 12 right answers and win his E hat, which Nova then wears. His questions are played
 * in his own Star Catch (trembling stars, and grey stars that must not be caught).
 * Set SHOTS_DIR for screenshots.
 */
test.use({ extraHTTPHeaders: { "x-forwarded-for": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
test.beforeEach(async ({ page }) => {
  // Game mode off: the fox's Star Catch must play anyway.
  await page.addInitScript(() => localStorage.setItem("starlight.gameMode", "off"));
});

const catalog = buildCatalog(units);
const upcoming = tests.find((t) => t.date >= new Date().toISOString().slice(0, 10));
type Mcq = Extract<Item, { type: "mcq" }>;
const mcqs = upcoming ? [...testItemIds(catalog, upcoming)].map((id) => catalog.itemById.get(id)!.item).filter((i): i is Mcq => i.type === "mcq") : [];

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS_DIR) return;
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${process.env.SHOTS_DIR}/${test.info().project.name}-${name}.png` });
}

async function dismissCelebrations(page: Page) {
  for (let i = 0; i < 5; i++) {
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog.getByRole("button").first().click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

/** Plays one of the fox's questions in his Star Catch: catches the right star (or a wrong one). */
async function play(page: Page, correct: boolean, shots?: string) {
  const game = page.getByRole("region", { name: "Star catch" });
  await expect(game).toBeVisible({ timeout: 30_000 });
  const id = await game.getAttribute("data-item");
  const item = mcqs.find((m) => m.id === id)!;
  const right = item.options[item.answer];
  if (shots) await shot(page, `${shots}-tremble`);
  const labels = (await game.locator(".sr-only button").allInnerTexts()).map((t) => t.replace(/^Catch the star: /, "").trim());
  const pick = correct ? right : labels.find((l) => l !== right)!;
  const button = game.getByRole("button", { name: `Catch the star: ${pick}`, exact: true });
  await button.focus({ timeout: 15_000 });
  await button.press("Enter");
  // Back at the castle, the outcome plays, with no explanation popping up over it…
  // (after the winning catch there's no bubble any more: he's beaten)
  await expect(page.locator(`[data-bubble="${correct ? "right" : "wrong"}"]`).or(page.getByText("Victory!").first())).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Not quite|Correct!/)).toHaveCount(0);
  if (shots) {
    await page.waitForTimeout(correct ? 400 : 650);
    await shot(page, `${shots}-${correct ? "right" : "wrong"}`);
  }
  // …then the student moves on when they want.
  const onward = page.getByRole("button", { name: /Next question|See your prize|Continue ▶/ });
  await expect(onward).toBeVisible({ timeout: 10_000 });
  if (!correct) await expect(page.getByRole("button", { name: "See my mistake" })).toBeVisible();
  if (shots) await shot(page, `${shots}-${correct ? "right" : "wrong"}-ready`);
  await onward.click();
  await dismissCelebrations(page);
  if (correct) {
    // on to his next game (it may be the same question again, if it was missed before), or the prize
    await expect(game.or(page.getByRole("heading", { name: "Victory!" }))).toBeVisible({ timeout: 15_000 });
  }
}

test("the Grey Fox: unlock him, beat him, win his E hat", async ({ page }) => {
  test.skip(!upcoming, "no upcoming test in content/tests.ts");
  test.setTimeout(240_000);
  const email = `f${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
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
  await page.getByLabel("Test prep").selectOption({ index: 1 });
  await expect(page.getByText("Test prep on")).toBeVisible();
  const code = (await page.locator(".font-mono").first().innerText()).trim();
  await page.click("text=Sign out");
  await page.goto("/join");
  await page.fill("#code", code);
  await page.click("text=Continue");
  for (const d of "1357") await page.click(`button:text-is("${d}")`);
  await page.waitForURL("**/home");

  // Locked at first.
  const banner = page.getByRole("region", { name: new RegExp(upcoming!.title) });
  await expect(banner.getByRole("paragraph").filter({ hasText: "The Grey Fox" })).toBeVisible();
  await expect(banner.getByLabel("Locked")).toBeVisible();

  // Meet enough of the test's questions (answered through the API to save time).
  await page.evaluate(async (list) => {
    for (const q of list) await fetch("/api/session/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: q.id, response: { type: "mcq", choice: q.choice }, seconds: 5, mode: "review" }) });
  }, mcqs.slice(0, 32).map((m) => ({ id: m.id, choice: m.options[m.answer] })));
  await page.reload();
  await shot(page, "f0-home");
  await banner.getByRole("link", { name: "⚔ Fight" }).click();
  await page.waitForURL(/mode=test-boss/);
  // Test hook: one grey star falls right onto Nova at the start.
  await page.goto(`${page.url()}&foxGrey=1`);
  await expect(page.getByRole("region", { name: "Boss battle: The Grey Fox" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("region", { name: "Star catch" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("3 of 3 hearts left").first()).toBeVisible();

  // The grey star lands in Nova's basket: like a wrong answer, the bubble is thrown and a heart breaks.
  await expect(page.locator('[data-bubble="wrong"]')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(650);
  await shot(page, "f1-grey-star");
  await expect(page.getByLabel("2 of 3 hearts left").first()).toBeVisible();
  // When the throw has played, the student can look at the mistake, then go on.
  await page.getByRole("button", { name: "See my mistake" }).click();
  await expect(page.getByText("Not quite")).toBeVisible();
  await shot(page, "f1-mistake");
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCelebrations(page);

  // A wrong answer star costs another heart. Then twelve right catches.
  await play(page, false, "f2");
  await expect(page.getByLabel("1 of 3 hearts left").first()).toBeVisible();
  for (let i = 0; i < 12; i++) {
    if (i === 6) {
      // Half his lives gone, he is angry: reach for the pause button and he leaps in to eat it
      // (the game goes on meanwhile, so catch the star straight after).
      const game = page.getByRole("region", { name: "Star catch" });
      await expect(game).toBeVisible({ timeout: 30_000 });
      await game.getByRole("button", { name: "Pause" }).click();
      await expect(page.locator("[data-chomp]")).toBeVisible();
      await expect(game.getByText("Paused")).toHaveCount(0);
    }
    if (i === 7) {
      // Only crumbs are left of it, for the rest of the battle.
      const game = page.getByRole("region", { name: "Star catch" });
      await expect(game.getByRole("img", { name: "The Grey Fox ate the pause button" })).toBeVisible({ timeout: 30_000 });
      await expect(game.getByRole("button", { name: "Pause" })).toHaveCount(0);
    }
    await play(page, true, i === 0 ? "f3" : i === 7 ? "f7" : undefined);
  }

  await expect(page.getByRole("heading", { name: "Victory!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("The E hat is yours!")).toBeVisible({ timeout: 15_000 });
  await dismissCelebrations(page);
  await page.waitForTimeout(800);
  await dismissCelebrations(page);
  await shot(page, "f4-victory");

  // It's in the shop like the bought hats, and Nova is wearing it.
  await page.getByRole("link", { name: "See your hats" }).click();
  const hat = page.locator("li", { hasText: "The Fox's E Hat" });
  await expect(hat.getByText("Wearing ✓")).toBeVisible({ timeout: 30_000 });
  await hat.scrollIntoViewIfNeeded();
  await shot(page, "f5-shop");
});
