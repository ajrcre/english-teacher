import { expect, test, type Page } from "@playwright/test";

/** Close any celebration (badge / level-up) dialogs that are open. */
async function dismissCelebrations(page: Page) {
  for (let i = 0; i < 4; i++) {
    const dialog = page.getByRole("dialog");
    if (!(await dialog.isVisible().catch(() => false))) return;
    // The dialog may already be animating away; don't wait on a disappearing element.
    await dialog.getByRole("button").click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(400);
  }
}

async function answerFirstChoiceAndContinue(page: Page) {
  await page.waitForTimeout(150);
  await page.locator("button.choice:not([disabled])").first().click();
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  const wrong = (await page.getByRole("status").getByText("Not quite").count()) > 0;
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissCelebrations(page);
  return wrong;
}

/** Each test creates its own family so tests are independent. */
async function setupFamily(page: Page) {
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
  await page.selectOption('select[name="focusUnit"]', "the-giver");
  await page.click('button:has-text("Add student")');
  await expect(page.getByRole("heading", { name: "Maya" })).toBeVisible();
  const code = (await page.locator(".font-mono").first().innerText()).trim();
  return { code };
}

test("student signs in with family code and PIN, practises, and the mistake comes back", async ({ page }) => {
  const { code } = await setupFamily(page);
  await page.click("text=Sign out");
  await page.waitForURL("**/");

  await page.goto("/join");
  await page.fill("#code", code);
  await page.click("text=Continue");
  await expect(page.getByText("Hi, Maya!")).toBeVisible();
  for (const d of "2468") await page.click(`button:text-is("${d}")`);
  await page.waitForURL("**/home");
  await expect(page.getByText("Today's mission")).toBeVisible();

  // Lesson with multiple-choice fill-ins (Chapters 3–4 words).
  await page.goto("/practice?mode=lesson&lesson=giver-ch3-4-vocab");
  const check = page.getByRole("button", { name: "Check answer" });
  await expect(check).toBeDisabled();

  // No hint, answer or feedback is visible before answering.
  await expect(page.getByText("The answer")).toHaveCount(0);
  await expect(page.getByText("Correct!")).toHaveCount(0);

  // Answer until we get one wrong, then check it comes back as a "Second chance".
  const sentence = () => page.locator("section p").nth(1).innerText();
  let wrongSentence: string | null = null;
  for (let i = 0; i < 8 && !wrongSentence; i++) {
    const current = await sentence();
    if (await answerFirstChoiceAndContinue(page)) wrongSentence = current;
  }
  expect(wrongSentence).not.toBeNull();
  let seenAgain = false;
  for (let i = 0; i < 7 && !seenAgain; i++) {
    await expect(page.locator("section")).toBeVisible();
    if ((await sentence()) === wrongSentence && (await page.getByText("Second chance").count()) > 0) seenAgain = true;
    else await answerFirstChoiceAndContinue(page);
  }
  expect(seenAgain).toBe(true);
});

test("parent dashboard shows the family code and student progress", async ({ page }) => {
  await setupFamily(page);
  await expect(page.getByText("Family code")).toBeVisible();
  await page.getByRole("button", { name: "Copy family code" }).click();
  await expect(page.getByRole("button", { name: "Family code copied" })).toBeVisible();
  await expect(page.getByText("Mastery by unit")).toBeVisible();
  await page.click("text=Review answer keys");
  await expect(page.getByRole("heading", { name: "Review answer keys" })).toBeVisible();
  await page.getByRole("button", { name: "Looks right" }).first().click();
  await expect(page.getByRole("button", { name: "✓ Looks right" }).first()).toBeVisible();
});

test("spelling dictation plays audio and accepts typed spelling", async ({ page }) => {
  await setupFamily(page);
  await page.getByRole("button", { name: /Start practice as Maya/ }).click();
  await page.waitForURL("**/home");
  await page.goto("/practice?mode=lesson&lesson=spelling-test-1");
  await expect(page.getByRole("button", { name: /Hear the word/ })).toBeVisible();
  await page.getByLabel("Your answer").fill("manage");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByRole("status")).toBeVisible();
});
