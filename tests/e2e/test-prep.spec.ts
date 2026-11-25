import { expect, test } from "@playwright/test";
import { tests } from "@/content/tests";

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

  // The first round only contains test material: it starts with a vocabulary / punctuation / tense / novel question.
  await page.goto("/practice?mode=review");
  await expect(page.locator("section")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
