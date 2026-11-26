import { expect, test } from "@playwright/test";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";

const catalog = buildCatalog(units);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("starlight.gameMode", "off"));
});

test("a student picks topics from different units and practises only those", async ({ page }) => {
  const email = `k${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
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

  const picked = ["gr-capitals", "poetry-figures"];
  await page.getByText("Choose topics to practise").click();
  const practise = page.getByRole("button", { name: "Pick at least one topic" });
  await expect(practise).toBeDisabled();
  for (const id of picked) await page.getByRole("checkbox", { name: catalog.lessonById.get(id)!.lesson.title }).check();
  if (process.env.SHOTS_DIR) {
    await page.getByRole("button", { name: "Practise these 2 topics" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${process.env.SHOTS_DIR}/${test.info().project.name}-topics.png` });
  }
  await page.getByRole("button", { name: "Practise these 2 topics" }).click();
  await page.waitForURL(/mode=lesson&lessons=/);
  for (const id of picked) expect(page.url()).toContain(id);
  await expect(page.getByText("Your 2 topics")).toBeVisible();

  // The round's questions all come from the two topics (checked on the round the server sends).
  const card = page.locator("section[data-item]");
  await expect(card).toBeVisible({ timeout: 30_000 });
  expect(picked).toContain(catalog.itemById.get((await card.getAttribute("data-item"))!)!.lessonId);
  const round = await page.evaluate(async () => {
    const res = await fetch("/api/session/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "lesson", lessonIds: ["gr-capitals", "poetry-figures"] }) });
    return ((await res.json()).items as { id: string }[]).map((i) => i.id);
  });
  const lessons = new Set(round.map((id) => catalog.itemById.get(id)!.lessonId));
  expect([...lessons].sort()).toEqual([...picked].sort());

  // The choice is remembered on this device.
  await page.goto("/home");
  await page.getByText("Choose topics to practise").click();
  await expect(page.getByRole("button", { name: "Practise these 2 topics" })).toBeVisible();
});
