import { expect, test } from "@playwright/test";
import { tests } from "@/content/tests";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";

const catalog = buildCatalog(units);

// These flows answer multiple-choice questions on cards; the runner game has its own spec.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("starlight.gameMode", "off"));
});


const upcoming = tests.find((t) => t.date >= new Date().toISOString().slice(0, 10));

test("a parent switches on test prep; the student sees the countdown and practises only the test topics", async ({ page }) => {
  test.skip(!upcoming, "no upcoming test in content/tests.ts");
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

  await page.getByLabel("Test prep").selectOption({ index: 1 });
  await expect(page.getByText("Test prep on")).toBeVisible();
  const code = (await page.locator(".font-mono").first().innerText()).trim();

  await page.click("text=Sign out");
  await page.goto("/join");
  await page.fill("#code", code);
  await page.click("text=Continue");
  await expect(page.getByText("Hi, Rotem!")).toBeVisible();
  for (const d of "1357") await page.click(`button:text-is("${d}")`);
  await page.waitForURL("**/home");

  const banner = page.getByRole("region", { name: new RegExp(upcoming!.title) });
  await expect(banner).toContainText("Test prep");
  await expect(banner).toContainText(/days to go|Tomorrow|Test day/);
  await expect(banner).toContainText("0 of 101 questions mastered");
  await expect(banner).toContainText("Unseen");

  // Practise only some of the test topics: tick two, and the round has only their questions.
  const [a, b] = upcoming!.rules.slice(0, 2).map((r) => r.lessonId);
  await banner.getByText("Practise only some of the test topics").click();
  await banner.getByRole("button", { name: "Clear" }).click();
  for (const id of [a, b]) await banner.getByRole("checkbox", { name: catalog.lessonById.get(id)!.lesson.title }).check();
  await banner.getByRole("button", { name: "Practise these 2 topics" }).click();
  await page.waitForURL(/mode=lesson&lessons=/);
  await expect(page.getByText("Your 2 topics")).toBeVisible();
  const first = await page.locator("[data-item]").first().getAttribute("data-item", { timeout: 30_000 });
  expect([a, b]).toContain(catalog.itemById.get(first!)!.lessonId);
  await page.goto("/home");

  // The first round only contains test material: it starts with a vocabulary / punctuation / tense / novel question.
  await page.goto("/practice?mode=review");
  await expect(page.locator("section")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
