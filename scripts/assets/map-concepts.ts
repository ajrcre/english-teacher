/**
 * Concept art for the adventure map (not part of the app until approved).
 *   npx tsx scripts/assets/map-concepts.ts [name...]
 * Writes PNGs to .concepts/ for review.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";

const LAYOUT = [
  "A tall portrait fantasy adventure MAP for a children's literature app. One winding dirt path snakes from the bottom of the map to the top, connecting seven distinct landmarks, each clearly separated with open space around it:",
  "(1) bottom-left: a small Danish fishing village on the coast with a wooden fishing boat in the harbour and a little lighthouse;",
  "(2) bottom-right: a neat community of many identical plain grey houses in perfect rows at the foot of a snowy hill, with a single bright red sled at the top of the hill;",
  "(3) middle-left: a cosy cottage built like a giant open storybook, with tiny scenes popping out of the pages — a little flying saucer, a red sweater, a clock;",
  "(4) middle-right: a snowy forest where the path splits into two roads, with a small horse and sleigh beside a frozen lake;",
  "(5) upper-left: a tall inventor's workshop tower with big brass gears, a telescope and a chimney;",
  "(6) upper-right: a blossoming tree with a golden honeycomb beehive and friendly bees flying around it;",
  "(7) top-centre: a mountain with a glowing cave entrance full of golden treasure and gems.",
  "Between landmarks: rolling meadows, a river with a small bridge, hills, trees and flowers. Do not draw any people or animals walking on the path.",
  "Keep the sky and water areas simple and calm (they will be animated later). Absolutely no text, letters, numbers, labels, banners, compass or scale bar anywhere.",
].join(" ");

const KEY = "Background: one flat, solid, uniform pure magenta colour (#FF00FF) filling the entire image, with no gradient, no texture, no ground line, no cast shadows, no labels and no text.";
const STYLE = "Style: genuinely HAND-DRAWN storybook illustration — loose wobbly black ink pen outlines, soft watercolour washes, coloured-pencil texture, charming and imperfect, NOT vector, NOT 3D.";

const JOBS: Record<string, { aspect: string; size?: string; prompt: string }> = {
  "nova-walk": {
    aspect: "16:9",
    size: "2K",
    prompt: `Character animation sheet of Nova, a small friendly fox with amber-orange fur, cream chest and tail tip, a teal scarf, carrying a small glowing paper lantern on a short stick. TOP ROW: four frames of a smooth side-view WALK CYCLE facing right, each frame the same size and the same design, evenly spaced with wide empty margins between them. BOTTOM ROW: three poses with wide margins between them — standing idle facing the viewer, a happy jump with the lantern raised, and curled up asleep. Every pose must be fully separated from the others. ${KEY} ${STYLE}`,
  },
  "map-props": {
    aspect: "16:9",
    size: "2K",
    prompt: `A sprite sheet of small decorative elements for a storybook map, arranged in a loose grid with wide empty margins so that no two elements touch: three different soft fluffy watercolour clouds (cream-white with faint blue-grey shading and a thin wobbly ink outline), one cute round bee seen from the side with its wings raised, the same bee with its wings lowered, three curly puffs of grey chimney smoke of different sizes, a golden four-pointed sparkle star, a tiny white snowflake, and a small swooping bird in flight. ${KEY} ${STYLE}`,
  },
  "map-a-golden": {
    aspect: "9:16",
    size: "2K",
    prompt: `${LAYOUT} Style: genuinely HAND-DRAWN storybook illustration — loose wobbly black ink pen outlines with visible cross-hatching, soft watercolour washes that bleed slightly past the lines, coloured-pencil texture, on warm cream watercolour paper with a subtle paper grain. Warm golden-hour daylight, friendly saturated colours (teal, amber, leaf green, brick red). Imperfect, charming, like an illustrator's original artwork, NOT vector, NOT 3D, NOT paper-cut.`,
  },
  "map-b-night": {
    aspect: "9:16",
    size: "2K",
    prompt: `${LAYOUT} Style: genuinely HAND-DRAWN storybook illustration — loose wobbly ink pen outlines with visible hatching, soft watercolour and gouache washes, chalky coloured-pencil texture, on deep indigo paper. Peaceful twilight: deep navy and teal landscape under a starry sky, glowing warm amber windows and lanterns, a luminous trail on the path. Imperfect, charming, like an illustrator's original artwork, NOT vector, NOT 3D, NOT paper-cut.`,
  },
  "nova-sheet": {
    aspect: "16:9",
    size: "2K",
    prompt: "A character model sheet of Nova, a small friendly fox with amber-orange fur, a cream chest and tail tip, a teal scarf, carrying a small glowing paper lantern on a short stick. Top row: four frames of a side-view WALK CYCLE facing right (contact, passing, contact, passing), same size, evenly spaced, feet on one invisible baseline. Bottom row: three poses — standing idle facing the viewer, happy jump with the lantern raised, and curled up sleeping. Plain flat warm cream background, no shadows on the ground, every pose clearly separated. Style: genuinely HAND-DRAWN storybook illustration — loose black ink pen outlines, soft watercolour washes, coloured-pencil texture, charming and imperfect. No text or labels.",
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
              config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: job.aspect, ...(job.size && attempt === 1 ? { imageSize: job.size } : {}) } },
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
