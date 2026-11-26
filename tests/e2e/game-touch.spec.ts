import { expect, test, type Locator, type Page } from "@playwright/test";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import type { Item } from "@/lib/content/schema";

/**
 * On a phone the mini-games fill the screen, and a tap anywhere on the game (not only on its
 * buttons, and not only on the field itself) moves Nova there. Set SHOTS_DIR to save screenshots.
 */
test.use({ extraHTTPHeaders: { "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

const LESSON = "gr-stative";
const mcqs = buildCatalog(units).lessonById.get(LESSON)!.lesson.items.filter((i): i is Extract<Item, { type: "mcq" }> => i.type === "mcq");

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS_DIR) return;
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${process.env.SHOTS_DIR}/${test.info().project.name}-${name}.png` });
}

async function signIn(page: Page) {
  const email = `t${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
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

/** Closes any celebration (a new badge, a level) that pops up over the game. */
async function closeCelebrations(page: Page) {
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(400);
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog.getByRole("button").first().click({ timeout: 3000 }).catch(() => undefined);
  }
}

async function box(l: Locator) {
  const b = await l.boundingBox();
  if (!b) throw new Error("not on screen");
  return b;
}

async function expectFillsScreen(page: Page, game: Locator) {
  const vp = page.viewportSize()!;
  const g = await box(game);
  expect(g.y + g.height).toBeLessThanOrEqual(vp.height + 1);
  expect(g.height).toBeGreaterThan(vp.height * 0.75);
  const field = await box(game.locator("[data-field]"));
  expect(field.width).toBeGreaterThan(vp.width * 0.9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("mini-games fill a phone screen and move Nova to a tap anywhere", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "touch layout is for phones");
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto(`/practice?mode=lesson&lesson=${LESSON}`);
  await expect(page.getByRole("button", { name: "🎮 Game" })).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");

  // Star Catch
  const stars = page.getByRole("region", { name: "Star catch" });
  await expect(stars).toBeVisible({ timeout: 30_000 });
  await expectFillsScreen(page, stars);
  await shot(page, "t1-stars");
  const field = await box(stars.locator("[data-field]"));
  // A tap on the score bar above the field (not the field itself) still moves Nova.
  const hud = await box(stars.getByText("STAR CATCH", { exact: true }));
  await page.touchscreen.tap(field.x + 12, hud.y + hud.height / 2);
  await expect.poll(async () => Number(await stars.getAttribute("data-x")), { timeout: 5000 }).toBeLessThan(30);
  await page.touchscreen.tap(field.x + field.width - 12, field.y + field.height * 0.6);
  await expect.poll(async () => Number(await stars.getAttribute("data-x")), { timeout: 5000 }).toBeGreaterThan(130);
  // Tapping the question to read it doesn't move her.
  const before = Number(await stars.getAttribute("data-x"));
  const question = await box(stars.locator("[data-no-steer]").first());
  await page.touchscreen.tap(question.x + 10, question.y + question.height / 2);
  await page.waitForTimeout(300);
  expect(Math.abs(Number(await stars.getAttribute("data-x")) - before)).toBeLessThanOrEqual(1);

  // Catch the right stars until the runner's turn comes.
  for (let i = 0; i < 3; i++) {
    const game = page.getByRole("region", { name: "Star catch" });
    if (await page.getByRole("region", { name: "Answer runner" }).isVisible()) break;
    const id = (await game.getAttribute("data-item"))!;
    const item = mcqs.find((m) => m.id === id)!;
    const button = game.getByRole("button", { name: `Catch the star: ${item.options[item.answer]}`, exact: true });
    await button.focus({ timeout: 15_000 });
    await button.press("Enter");
    for (let k = 0; k < 50; k++) {
      const dialog = page.getByRole("dialog");
      if (await dialog.isVisible().catch(() => false)) await dialog.getByRole("button").click({ timeout: 3000 }).catch(() => undefined);
      if (await page.getByRole("region", { name: "Answer runner" }).isVisible()) break;
      const now = await game.getAttribute("data-item", { timeout: 500 }).catch(() => null);
      if (now && now !== id) break;
      await page.waitForTimeout(200);
    }
  }

  // The lane runner
  const runner = page.getByRole("region", { name: "Answer runner" });
  await expect(runner).toBeVisible({ timeout: 30_000 });
  await closeCelebrations(page);
  await expectFillsScreen(page, runner);
  await shot(page, "t2-runner");
  const lanes = await runner.locator(".sr-only button").count();
  const rf = await box(runner.locator("[data-field]"));
  // Below the field (between it and the buttons): the bottom lane.
  const down = await box(runner.getByRole("button", { name: "Move down a lane" }));
  await page.touchscreen.tap(rf.x + rf.width / 2, (rf.y + rf.height + down.y) / 2);
  await expect(runner).toHaveAttribute("data-lane", String(lanes - 1));
  // The sky above the lanes: the top lane.
  await page.touchscreen.tap(rf.x + rf.width / 2, rf.y + 6);
  await expect(runner).toHaveAttribute("data-lane", "0");
  await shot(page, "t3-steered");
});
