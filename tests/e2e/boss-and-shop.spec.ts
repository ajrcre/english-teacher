import { expect, test, type Page } from "@playwright/test";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import type { Item } from "@/lib/content/schema";

// These flows answer multiple-choice questions on cards; the runner game has its own spec.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("starlight.gameMode", "off"));
});


/**
 * The game layer end to end: unlock a lesson's boss, win the battle (losing one heart on
 * purpose), open the chests, see the legendary sticker in the album and spend stars in the shop.
 * Set SHOTS_DIR to also save screenshots of each screen.
 */
// Its own client address, so this test's signup doesn't use up the other tests' signup rate limit.
test.use({ extraHTTPHeaders: { "x-forwarded-for": `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });

const LESSON = "gr-stative"; // 10 multiple-choice questions; the Cog Golem unlocks after 5
const mcqs = buildCatalog(units).lessonById.get(LESSON)!.lesson.items.filter((i): i is Extract<Item, { type: "mcq" }> => i.type === "mcq");

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS_DIR) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${process.env.SHOTS_DIR}/${test.info().project.name}-${name}.png` });
}

async function dismissCelebrations(page: Page) {
  for (let i = 0; i < 5; i++) {
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog.getByRole("button").click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
}

/** Picks the right (or a wrong) option by recognising the question from its options. */
async function answer(page: Page, correct: boolean, screenshot?: string) {
  const options = page.locator("button.choice:not([disabled]) span:nth-child(2)");
  // The first visit to a page can take a while in dev mode (on-demand compiling).
  await expect(options.first()).toBeVisible({ timeout: 30_000 });
  const texts = (await options.allInnerTexts()).map((t) => t.trim());
  const id = await page.locator("section[data-item]:has(button.choice:not([disabled]))").getAttribute("data-item");
  const item = mcqs.find((m) => m.id === id);
  expect(item, `question ${id}`).toBeTruthy();
  const right = item!.options[item!.answer];
  const pick = correct ? right : texts.find((t) => t !== right)!;
  // Exact match: "think" must not also match "am thinking".
  await page.locator("button.choice:not([disabled])").filter({ has: page.locator("span:nth-child(2)").getByText(pick, { exact: true }) }).click();
  if (screenshot) await shot(page, screenshot);
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
  if (screenshot) {
    await page.waitForTimeout(900); // let the page finish scrolling the answers above the sheet
    await shot(page, `${screenshot}-feedback`);
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCelebrations(page);
}

async function signIn(page: Page) {
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
  await page.selectOption('select[name="focusUnit"]', "grammar");
  await page.click('button:has-text("Add student")');
  await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
  const code = (await page.locator(".font-mono").first().innerText()).trim();
  await page.click("text=Sign out");
  await page.waitForURL("**/");
  await page.goto("/join");
  await page.fill("#code", code);
  await page.click("text=Continue");
  for (const d of "2468") await page.click(`button:text-is("${d}")`);
  await page.waitForURL("**/home");
}

test("unlock a boss, win the battle, collect the loot and shop", async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page);

  // The boss is locked until half the lesson has been practised.
  await page.goto("/unit/grammar");
  await expect(page.getByLabel(/Boss locked: practise 5 more questions in Stative/)).toBeVisible();

  // Practise the lesson until the round ends.
  await page.goto(`/practice?mode=lesson&lesson=${LESSON}`);
  // Nova's journey strip replaces the progress bar and moves forward with each answer.
  const journey = page.getByRole("progressbar", { name: "Round progress" });
  await expect(journey).toHaveAttribute("aria-valuenow", "0", { timeout: 30_000 });
  await shot(page, "00a-journey-start");
  for (let i = 0; i < 20; i++) {
    if (await page.getByText("Round complete").isVisible().catch(() => false)) break;
    await answer(page, true, i === 3 ? "00b-journey-combo" : undefined);
    if (i === 0) expect(Number(await journey.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  }
  await expect(page.getByText("Round complete")).toBeVisible();
  await dismissCelebrations(page);

  // A treasure chest ends the round.
  await shot(page, "01-round-chest");
  await page.getByRole("button", { name: "Open the treasure chest" }).click();
  await expect(page.getByRole("status").filter({ hasText: /sticker|stars/ })).toBeVisible();
  await dismissCelebrations(page);
  await shot(page, "02-round-chest-open");

  // The boss is now unlocked: fight it.
  await page.getByRole("link", { name: /Face the boss/ }).click();
  await expect(page.getByText("BOSS BATTLE")).toBeVisible();
  await expect(page.getByLabel("Boss battle: The Cog Golem")).toBeVisible();
  await expect(page.getByLabel("3 of 3 hearts left")).toBeVisible();
  await shot(page, "03-boss-intro");

  await answer(page, false, "04-boss-wrong");
  await expect(page.getByLabel("2 of 3 hearts left")).toBeVisible();
  for (let i = 0; i < 12; i++) {
    if (await page.getByRole("heading", { name: "Victory!" }).isVisible().catch(() => false)) break;
    await answer(page, true, i === 1 ? "05-boss-hit" : undefined);
  }
  await expect(page.getByRole("heading", { name: "Victory!" })).toBeVisible();
  await expect(page.getByText(/\+\d+ XP · \+\d+ stars/)).toBeVisible();
  await dismissCelebrations(page);
  await shot(page, "06-victory");

  // The boss chest holds the legendary sticker.
  await page.getByRole("button", { name: "Open the treasure chest" }).click();
  await expect(page.getByText("Legendary sticker")).toBeVisible();
  await shot(page, "07-boss-chest");

  // The unit page shows the boss beaten with the hearts kept.
  await page.goto("/unit/grammar");
  await expect(page.getByLabel(/Fight again The Cog Golem/)).toBeVisible();
  await shot(page, "08-unit");

  // The album has the legendary sticker.
  await page.goto("/album");
  await expect(page.getByText("The Cog Golem")).toBeVisible();
  await shot(page, "09-album");

  // Spend stars in the shop: a party hat for Nova and a bronze frame, both worn straight away.
  await page.goto("/shop");
  await shot(page, "10-shop");
  await page.getByRole("button", { name: "Buy Party Hat for 10 stars" }).click();
  await expect(page.getByText("Party Hat is yours")).toBeVisible();
  await expect(page.locator("li", { hasText: "Party Hat" }).getByText("Wearing ✓")).toBeVisible();
  await page.getByRole("button", { name: "Buy Bronze Frame for 20 stars" }).click();
  await expect(page.getByText("Bronze Frame is yours")).toBeVisible();
  await expect(page.locator("li", { hasText: "Bronze Frame" }).getByText("Wearing ✓")).toBeVisible();
  await shot(page, "10b-shop-hat");
  await page.goto("/home");
  await expect(page.locator(".frame-bronze")).toBeVisible();
  await shot(page, "11-home");

  // The profile (tap the avatar) shows the new boss badge and lets you pick the frame.
  await page.getByRole("link", { name: "Your profile" }).click();
  await page.waitForURL("**/profile");
  await expect(page.getByRole("heading", { name: "Badges" })).toBeVisible();
  await expect(page.getByText("Shadow Tamer")).toBeVisible();
  await expect(page.getByRole("button", { name: "bronze frame" })).toBeVisible();
  await shot(page, "12-profile");

  // Nova wears her new hat on the journey strip of the next round.
  await page.goto(`/practice?mode=lesson&lesson=${LESSON}`);
  await expect(page.getByRole("progressbar", { name: "Round progress" })).toBeVisible({ timeout: 30_000 });
  await shot(page, "13-journey-hat");
});
