/**
 * Concept art for the app splash screen (not part of the app until approved).
 *   npx tsx scripts/assets/splash-concepts.ts [name...]
 * Writes PNGs to .concepts/ for review. The title and buttons are real HTML text, so the art has none.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";

const STYLE =
  "Style: genuinely HAND-DRAWN storybook illustration, matching an adventure map for children: loose wobbly black ink pen outlines with light hatching, soft watercolour washes that bleed slightly past the lines, coloured-pencil texture, on warm cream watercolour paper with a subtle grain. Friendly saturated colours (teal, amber, leaf green, brick red). Imperfect and charming, NOT vector, NOT 3D, NOT paper-cut.";
const NO_TEXT = "Absolutely no text, letters, numbers, banners, signs, logos or frames anywhere, and no people or animals.";
const SCENE =
  "a wide open view across a gentle meadow valley. A winding sandy path curls from the empty foreground up toward the horizon, where tiny distant landmarks sit along it: a red-and-white lighthouse by the sea, a tower with brass gears, a storybook cottage, a blossoming tree with a golden beehive, and a mountain with a softly glowing cave. Snowy pine hills on one side, a small river with a bridge. The middle of the lower foreground is calm open grass (a character will be added there later), and the upper third is a calm, mostly empty sky with a few soft clouds, leaving space for a title.";

const JOBS: Record<string, { aspect: string; prompt: string }> = {
  "splash-golden-portrait": {
    aspect: "9:16",
    prompt: `A tall portrait splash-screen illustration: ${SCENE} Warm golden-hour light, a low sun glowing near the horizon, a peach-and-sky-blue sky. ${NO_TEXT} ${STYLE}`,
  },
  "splash-golden-wide": {
    aspect: "16:9",
    prompt: `A wide landscape splash-screen illustration: ${SCENE} Warm golden-hour light, a low sun glowing near the horizon, a peach-and-sky-blue sky. Keep the left and right thirds simple so the picture can be cropped. ${NO_TEXT} ${STYLE}`,
  },
  "splash-dusk-portrait": {
    aspect: "9:16",
    prompt: `A tall portrait splash-screen illustration: ${SCENE} Peaceful early twilight: a gradient sky from deep teal and indigo at the top to rose and amber at the horizon, the first bright stars appearing, warm amber glowing windows and lanterns along the path. ${NO_TEXT} ${STYLE}`,
  },
  "splash-dusk-wide": {
    aspect: "16:9",
    prompt: `A wide landscape splash-screen illustration: ${SCENE} Peaceful early twilight: a gradient sky from deep teal and indigo at the top to rose and amber at the horizon, the first bright stars appearing, warm amber glowing windows and lanterns along the path. Keep the left and right thirds simple so the picture can be cropped. ${NO_TEXT} ${STYLE}`,
  },
};

async function main(): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey: key });
  const only = process.argv.slice(2);
  mkdirSync(".concepts", { recursive: true });
  await Promise.all(
    Object.entries(JOBS)
      .filter(([name]) => !only.length || only.includes(name))
      .map(async ([name, job]) => {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await ai.models.generateContent({
              model: MODEL,
              contents: job.prompt,
              config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: job.aspect, ...(attempt === 1 ? { imageSize: "2K" } : {}) } },
            });
            const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
            if (!part?.inlineData?.data) throw new Error("no image in response");
            writeFileSync(`.concepts/${name}.png`, Buffer.from(part.inlineData.data, "base64"));
            console.log(`✓ ${name}`);
            return;
          } catch (e) {
            console.warn(`  retry ${name}: ${e instanceof Error ? e.message.slice(0, 160) : e}`);
            await new Promise((r) => setTimeout(r, 3000));
          }
        }
        console.error(`✗ ${name} failed`);
      }),
  );
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
