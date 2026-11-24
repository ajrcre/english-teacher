/**
 * Renders the link-preview image (Open Graph / social cards) shown when someone shares the site
 * in WhatsApp, iMessage, Facebook, X, Slack, etc.
 *
 *   npm run assets:og
 *
 * Writes public/og.jpg (1200×630; JPEG keeps it well under WhatsApp's ~300 KB preview limit):
 * the dusk landscape from the splash screen, the title in Fraunces, and Nova waving. Needs network access to Google Fonts. Set PW_CHROMIUM to use a
 * pre-installed Chromium, as in playwright.config.ts.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const dataUrl = (file: string) => `data:image/webp;base64,${readFileSync(path.join(root, file)).toString("base64")}`;

const html = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,600&family=Atkinson+Hyperlegible+Next:wght@600&display=block" rel="stylesheet">
<style>
  html, body { margin: 0; }
  .card { position: relative; width: 1200px; height: 630px; overflow: hidden; background: #0d1a2b url(${dataUrl("public/art/splash/dusk-wide.webp")}) center 70% / cover; }
  .card::before { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgb(13 26 43 / 0.92) 0%, rgb(13 26 43 / 0.72) 40%, rgb(13 26 43 / 0) 64%); }
  .text { position: absolute; left: 64px; top: 52px; right: 64px; color: #fbf6ea; }
  .brand { display: flex; align-items: center; gap: 14px; font: 600 30px "Fraunces", serif; }
  .brand svg { width: 40px; height: 40px; }
  h1 { margin: 22px 0 0; font: 600 76px/1.02 "Fraunces", serif; letter-spacing: -0.02em; text-shadow: 0 2px 18px rgb(13 26 43 / 0.6); }
  h1 em { color: #f6c86a; }
  .tag { margin-top: 18px; font: 600 26px "Atkinson Hyperlegible Next", sans-serif; color: #dbe3ee; text-shadow: 0 1px 10px rgb(13 26 43 / 0.8); }
  .nova { position: absolute; right: 120px; bottom: 34px; height: 250px; filter: drop-shadow(0 10px 14px rgb(0 0 0 / 0.35)); }
</style></head><body>
<div class="card">
  <div class="text">
    <div class="brand"><svg viewBox="0 0 64 64"><path d="M32 10l5.6 14.9L53 26l-12 9.6L45 51l-13-8.6L19 51l4-15.4L11 26l15.4-1.1z" fill="#f2a93b"/></svg>Starlight English</div>
    <h1>Light up the sky,<br><em>one word at a time.</em></h1>
    <div class="tag">Year 7 English practice · 20 minutes a day</div>
  </div>
  <img class="nova" src="${dataUrl("public/art/splash/pose-wave.webp")}" alt="">
</div></body></html>`;

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.locator(".card").screenshot({ path: path.join(root, "public/og.jpg"), type: "jpeg", quality: 84 });
  await browser.close();
  console.log("wrote public/og.jpg");
}

void main();
