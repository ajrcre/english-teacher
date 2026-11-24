/**
 * Renders the home-screen icons for the installable app (PWA) from the star logo in public/icon.svg.
 *
 *   npm run assets:icons
 *
 * Writes to public/icons/:
 *   icon-192.png, icon-512.png    rounded tile with transparent corners (manifest purpose "any")
 *   maskable-512.png              full-bleed square, star inside the 80% safe zone (Android adaptive icons)
 *   apple-touch-icon.png          180px full-bleed square; iOS rounds the corners itself
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const NAVY = "#0d1a2b";
const AMBER = "#f2a93b";
// The star from public/icon.svg, drawn in a 64×64 box.
const STAR = "M32 10l5.6 14.9L53 26l-12 9.6L45 51l-13-8.6L19 51l4-15.4L11 26l15.4-1.1z";

/** `starScale` shrinks the star around the centre so it survives circular / squircle masks. */
function svg({ rounded, starScale }: { rounded: boolean; starScale: number }) {
  const t = 32 * (1 - starScale);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%">
    <rect width="64" height="64" ${rounded ? 'rx="14"' : ""} fill="${NAVY}"/>
    <g transform="translate(${t} ${t + 1.5 * starScale}) scale(${starScale})"><path d="${STAR}" fill="${AMBER}"/></g>
  </svg>`;
}

const ICONS = [
  { file: "icon-192.png", size: 192, rounded: true, starScale: 1 },
  { file: "icon-512.png", size: 512, rounded: true, starScale: 1 },
  { file: "maskable-512.png", size: 512, rounded: false, starScale: 0.72 },
  { file: "apple-touch-icon.png", size: 180, rounded: false, starScale: 0.86 },
];

async function main() {
  const out = path.join(process.cwd(), "public/icons");
  mkdirSync(out, { recursive: true });
  // PW_CHROMIUM: path to a pre-installed Chromium, as in playwright.config.ts.
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  for (const icon of ICONS) {
    const page = await browser.newPage({ viewport: { width: icon.size, height: icon.size }, deviceScaleFactor: 1 });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">${svg(icon)}</body></html>`,
    );
    await page.locator("svg").screenshot({ path: path.join(out, icon.file), omitBackground: true });
    await page.close();
    console.log(`wrote public/icons/${icon.file}`);
  }
  await browser.close();
}

void main();
