import { expect, test, type Page } from "@playwright/test";
import { tests } from "@/content/tests";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { testItemIds } from "@/lib/content/testScope";
import type { Item } from "@/lib/content/schema";

/**
 * The Grey Fox, the test-prep boss: unlock him by meeting the test's questions, fight him
 * (his questions come in speech bubbles; a wrong answer gets a bubble thrown at Nova), beat
 * him with 12 right answers and win his E hat, which Nova then wears. Set SHOTS_DIR for screenshots.
 */
test.use({ extraHTTPHeaders: { "x-forwarded-for": `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
test.beforeEach(async ({ page }) => {
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

/** Answers the fox's current question (right or wrong) on its card. */
async function answer(page: Page, correct: boolean, shots?: string) {
  const card = page.locator("section[data-item]:has(button.choice:not([disabled]))");
  await expect(card).toBeVisible({ timeout: 30_000 });
  const id = await card.getAttribute("data-item");
  const item = mcqs.find((m) => m.id === id)!;
  const right = item.options[item.answer];
  const texts = (await card.locator("button.choice span:nth-child(2)").allInnerTexts()).map((t) => t.trim());
  const pick = correct ? right : texts.find((t) => t !== right)!;
  if (shots) await shot(page, `${shots}-ask`);
  await card.locator("button.choice").filter({ has: page.locator("span:nth-child(2)").getByText(pick, { exact: true }) }).click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.locator(`[data-bubble="${correct ? "right" : "wrong"}"]`).or(page.getByText("Victory!").first())).toBeVisible({ timeout: 10_000 });
  if (shots) {
    await page.waitForTimeout(correct ? 150 : 700); // mid-throw for a wrong answer
    await shot(page, `${shots}-${correct ? "right" : "wrong"}`);
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCelebrations(page);
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
  await expect(page.getByRole("region", { name: "Boss battle: The Grey Fox" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByLabel("3 of 3 hearts left")).toBeVisible();
  await page.waitForLoadState("networkidle");

  // One wrong answer: the bubble is thrown, a heart breaks. Then twelve right answers.
  await answer(page, false, "f1");
  await expect(page.getByLabel("2 of 3 hearts left")).toBeVisible();
  for (let i = 0; i < 12; i++) await answer(page, true, i === 0 ? "f2" : undefined);

  await expect(page.getByRole("heading", { name: "Victory!" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("The E hat is yours!")).toBeVisible({ timeout: 15_000 });
  await dismissCelebrations(page);
  await page.waitForTimeout(800);
  await dismissCelebrations(page);
  await shot(page, "f3-victory");

  // It's in the shop like the bought hats, and Nova is wearing it.
  await page.getByRole("link", { name: "See your hats" }).click();
  const hat = page.locator("li", { hasText: "The Fox's E Hat" });
  await expect(hat.getByText("Wearing ✓")).toBeVisible({ timeout: 30_000 });
  await hat.scrollIntoViewIfNeeded();
  await shot(page, "f4-shop");
});
