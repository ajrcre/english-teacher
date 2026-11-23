import { expect, test, type Page } from "@playwright/test";

/** A fresh family with one student, signed in as that student on the home screen. */
async function signInAsStudent(page: Page) {
  const email = `m${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto("/parent/signup");
  await page.fill('input[name="name"]', "Dana");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button:has-text("Create account")');
  await page.waitForURL("**/parent");
  await page.click("text=+ Add a student");
  await page.fill('input[name="name"]', "Maya");
  await page.fill('input[name="pin"]', "2468");
  await page.selectOption('select[name="focusUnit"]', "the-giver");
  await page.click('button:has-text("Add student")');
  await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
  const code = (await page.locator(".font-mono").first().innerText()).trim();
  await page.click("text=Sign out");
  await page.goto("/join");
  await page.fill("#code", code);
  await page.click("text=Continue");
  await expect(page.getByText("Hi, Maya!")).toBeVisible();
  for (const d of "2468") await page.click(`button:text-is("${d}")`);
  await page.waitForURL("**/home");
}

test("the splash shows on the first visit only, then the normal landing page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".sp-root")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Starlight\s+English/ })).toBeVisible();
  await expect(page.locator(".sp-landing")).toBeHidden();

  // The buttons appear once Nova has "lit her lantern".
  const start = page.getByRole("link", { name: /Start the adventure/ });
  await expect(page.locator(".sp-root.sp-ready")).toBeVisible();
  await start.click();
  await page.waitForURL("**/join");

  await page.goto("/");
  await expect(page.locator(".sp-root")).toBeHidden();
  await expect(page.getByRole("link", { name: "I'm a student" })).toBeVisible();

  // `?splash` brings it back for another look.
  await page.goto("/?splash");
  await expect(page.locator(".sp-root")).toBeVisible();
});

test("the splash's parent button goes to parent sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".sp-root.sp-ready")).toBeVisible();
  await page.getByRole("link", { name: /I.m a parent/ }).click();
  await page.waitForURL("**/parent/login");
});

test("the splash fits the screen without scrolling sideways", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".sp-root.sp-ready")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.getByRole("link", { name: /Start the adventure/ }).boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width);
});

test("the home screen is an adventure map: pick a place, Nova walks there, open its lessons", async ({ page }) => {
  await signInAsStudent(page);
  await expect(page.getByText("Today's mission")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const pins = page.locator(".am-pin");
  await expect(pins).toHaveCount(7);
  const nova = page.locator(".am-nova");
  await expect(nova).toBeAttached();
  const before = await nova.evaluate((el) => (el as HTMLElement).style.left + "," + (el as HTMLElement).style.top);

  const poetry = page.getByRole("button", { name: /^Poetry:/ });
  await poetry.scrollIntoViewIfNeeded();
  await poetry.click();
  const card = page.locator(".am-tag.am-act");
  await expect(card).toContainText("Poetry");
  await expect(card).toContainText("of 8 stars lit");

  // She actually walks: her position changes, and she ends at the place's spot.
  await expect.poll(() => nova.evaluate((el) => (el as HTMLElement).style.left + "," + (el as HTMLElement).style.top), { timeout: 15_000 }).not.toBe(before);
  await expect.poll(() => nova.evaluate((el) => (el as HTMLElement).style.left), { timeout: 20_000 }).toBe("67.857%");

  await card.getByRole("link", { name: "Open lessons" }).click();
  await page.waitForURL("**/unit/poetry");

  // Coming back, she is still waiting at Poetry.
  await page.goBack();
  await expect(page.locator(".am-nova")).toBeAttached();
  await expect.poll(() => page.locator(".am-nova").evaluate((el) => (el as HTMLElement).style.left)).toBe("67.857%");
});

test("map places can be reached with the keyboard and the nature sounds can be switched off", async ({ page }) => {
  await signInAsStudent(page);
  await expect(page.locator(".am-nova")).toBeAttached(); // the map is interactive once Nova appears
  const pin = page.getByRole("button", { name: /^Short Stories:/ });
  await page.keyboard.press("Shift"); // switch to keyboard modality, as a person pressing Tab would
  await pin.focus();
  await expect(page.locator(".am-tag.am-show")).toContainText("Short Stories");
  await expect(page.locator(".am-stage.am-spot")).toBeAttached();
  await page.keyboard.press("Enter");
  await expect(page.locator(".am-tag.am-act")).toContainText("Open lessons");

  // Every place is also a plain link for screen readers.
  await expect(page.locator("ul.sr-only a[href='/unit/short-stories']")).toHaveCount(1);

  const sound = page.getByRole("button", { name: /Sounds (on|off)/ });
  await expect(sound).toHaveAttribute("aria-pressed", "true");
  await sound.click();
  await expect(sound).toHaveAttribute("aria-pressed", "false");
  await page.reload();
  await expect(page.getByRole("button", { name: /Sounds off/ })).toHaveAttribute("aria-pressed", "false");
});

test("the painted buttons keep their shape at any width", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".sp-root.sp-ready")).toBeVisible();
  const primary = page.getByRole("link", { name: /Start the adventure/ });
  const style = await primary.evaluate((el) => getComputedStyle(el).borderImageSource);
  expect(style).toContain("/art/ui/btn-amber.webp");
});
