/**
 * Generates the app's illustrations with Gemini image generation and saves them
 * as WebP in public/art. Every image shares one fixed art-direction prompt so
 * the set looks like it was made by one illustrator.
 *
 *   npx tsx scripts/assets/gen-images.ts            # only missing images
 *   npx tsx scripts/assets/gen-images.ts --force    # regenerate all
 *   npx tsx scripts/assets/gen-images.ts hero units/poetry   # only these
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";

const STYLE = [
  "Art direction: layered paper-cut illustration, like a hand-made shadow box.",
  "Flat cut-paper shapes with soft drop shadows between layers and a fine paper-fibre texture.",
  "Limited palette: deep ink navy (#0d1a2b) and midnight blue for the night, warm cream paper (#f6f1e7), amber gold (#f2a93b) for light and stars, with small touches of muted teal (#3fb3a8).",
  "Full-bleed composition that fills the entire canvas edge to edge: no picture frame, no border, no mat, no vignette.",
  "Calm, warm, storybook mood suitable for a 12-year-old's literature app. Elegant and minimal, generous negative space.",
  "Absolutely no text, letters, numbers, logos, signatures or watermarks anywhere in the image.",
].join(" ");

interface Job {
  out: string;
  prompt: string;
  aspect: "1:1" | "16:9";
  width: number;
}

const medallion = (subject: string) =>
  `A round badge medallion centred on a plain deep ink navy background: ${subject}. The medallion is a circle of layered cream and amber paper with a thin gold rim. Simple, iconic, readable at small size.`;

const avatar = (animal: string) =>
  `A friendly portrait of a ${animal}, head and shoulders, facing the viewer, centred in a circle, on a plain deep ink navy background with two or three tiny amber stars. Simple shapes, warm expression, works as a small profile picture.`;

const mascot = (pose: string) =>
  `Nova, a small friendly fox made of layered paper, with a cream chest and amber-orange fur, carrying a small glowing paper lantern. ${pose} Full body, centred, on a plain deep ink navy background with a few tiny stars. The same character design every time.`;

const JOBS: Job[] = [
  { out: "hero", aspect: "1:1", width: 1024, prompt: "A small paper-cut fox sits on a grassy hill holding a glowing lantern, looking up at a night sky full of constellations; an open book lies beside it with a few stars rising out of its pages." },
  { out: "mascot/idle", aspect: "1:1", width: 512, prompt: mascot("Sitting calmly and smiling, lantern held up.") },
  { out: "mascot/think", aspect: "1:1", width: 512, prompt: mascot("Thinking, head tilted, one paw on its chin, lantern on the ground.") },
  { out: "mascot/cheer", aspect: "1:1", width: 512, prompt: mascot("Cheering with both arms up, lantern swinging, small sparkles around.") },
  { out: "mascot/encourage", aspect: "1:1", width: 512, prompt: mascot("Giving a gentle thumbs-up with a kind, encouraging smile.") },
  { out: "mascot/celebrate", aspect: "1:1", width: 512, prompt: mascot("Jumping with joy among falling golden paper stars.") },
  { out: "mascot/sleepy", aspect: "1:1", width: 512, prompt: mascot("Curled up asleep next to its dimmed lantern under a crescent moon.") },
  { out: "units/number-the-stars", aspect: "16:9", width: 1280, prompt: "A quiet Danish fishing village by the sea at night in the 1940s: small houses with steep roofs, a wooden fishing boat in the harbour, a narrow strip of water with a distant far shore, and a sky full of bright stars. A tiny figure of a girl walks along a forest path carrying a basket." },
  { out: "units/the-giver", aspect: "16:9", width: 1280, prompt: "A neat, identical, colourless community of small grey houses in perfect rows, drawn in greys and cream; beyond it a snowy hill with a single red wooden sled at the top — the only strong colour — and warm lights glowing far away under the stars." },
  { out: "units/short-stories", aspect: "16:9", width: 1280, prompt: "A large open book standing like a stage, with small scenes rising from its pages: a little house, a red sweater hanging on a chair, a flying saucer above a desert town, a wine glass, and a clock — all in layered paper under a starry sky." },
  { out: "units/poetry", aspect: "16:9", width: 1280, prompt: "A snowy wood at evening where a forest path divides into two roads; a small horse with a sleigh waits by a frozen lake; soft snowflakes and a few stars." },
  { out: "units/grammar", aspect: "16:9", width: 1280, prompt: "A tidy, cosy inventor's workshop at night: brass gears, wooden building blocks, a small telescope, pencils and rulers neatly arranged on a desk by a window full of stars. No letters or writing on anything." },
  { out: "units/spelling", aspect: "16:9", width: 1280, prompt: "Friendly paper honeybees flying around a glowing honeycomb hanging from a branch at dusk, with golden light and a starry sky." },
  { out: "units/word-treasury", aspect: "16:9", width: 1280, prompt: "An open treasure chest in a small cave, overflowing with glowing amber gems and tiny paper stars, with a lantern on a rock nearby." },
  ...(["fox", "owl", "whale", "deer", "otter", "heron", "bear", "lynx"] as const).map((a) => ({ out: `avatars/${a}`, aspect: "1:1" as const, width: 256, prompt: avatar(a) })),
  { out: "scenes/level-up", aspect: "1:1", width: 512, prompt: "A paper rocket made of cream and amber paper rising through a dark sky, leaving a trail of golden stars, inside a circle." },
  { out: "scenes/star-lit", aspect: "1:1", width: 512, prompt: "A single large amber star lighting up in the centre of a small constellation of fainter stars connected by thin lines, inside a circle." },
  { out: "badges/first-light", aspect: "1:1", width: 320, prompt: medallion("a small lantern being lit for the first time") },
  { out: "badges/first-star", aspect: "1:1", width: 320, prompt: medallion("one bright amber star") },
  { out: "badges/constellation", aspect: "1:1", width: 320, prompt: medallion("a small constellation of five connected stars") },
  { out: "badges/combo-5", aspect: "1:1", width: 320, prompt: medallion("a rolling wave of five small stars") },
  { out: "badges/combo-10", aspect: "1:1", width: 320, prompt: medallion("a shooting star with a long golden tail") },
  { out: "badges/combo-25", aspect: "1:1", width: 320, prompt: medallion("a bursting supernova of amber rays") },
  { out: "badges/streak-3", aspect: "1:1", width: 320, prompt: medallion("three small crescent moons in a row") },
  { out: "badges/streak-7", aspect: "1:1", width: 320, prompt: medallion("a calendar-like ring of seven small stars around a flame") },
  { out: "badges/streak-30", aspect: "1:1", width: 320, prompt: medallion("the phases of the moon arranged in a circle") },
  { out: "badges/fixer-10", aspect: "1:1", width: 320, prompt: medallion("a pencil with an eraser fixing a crooked star") },
  { out: "badges/fixer-50", aspect: "1:1", width: 320, prompt: medallion("a mountain climber's flag on a peak under stars") },
  { out: "badges/mastered-100", aspect: "1:1", width: 320, prompt: medallion("a jar filled with glowing stars") },
  { out: "badges/mastered-500", aspect: "1:1", width: 320, prompt: medallion("a spiral galaxy") },
  { out: "badges/full-mission", aspect: "1:1", width: 320, prompt: medallion("a compass rose with a star at its centre") },
  { out: "badges/unit-number-the-stars", aspect: "1:1", width: 320, prompt: medallion("a small Star of David necklace on a chain beside a wooden fishing boat") },
  { out: "badges/unit-the-giver", aspect: "1:1", width: 320, prompt: medallion("a red apple and a sled") },
  { out: "badges/unit-short-stories", aspect: "1:1", width: 320, prompt: medallion("a small stack of books with a bookmark") },
  { out: "badges/unit-poetry", aspect: "1:1", width: 320, prompt: medallion("a quill pen and a path splitting into two roads") },
  { out: "badges/unit-grammar", aspect: "1:1", width: 320, prompt: medallion("interlocking brass gears") },
  { out: "badges/unit-spelling", aspect: "1:1", width: 320, prompt: medallion("a friendly honeybee") },
  { out: "badges/unit-word-treasury", aspect: "1:1", width: 320, prompt: medallion("a key and a glowing gem") },
];

async function generate(ai: GoogleGenAI, job: Job): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: `${job.prompt}\n\n${STYLE}`,
        config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: job.aspect } },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) throw new Error("no image in response");
      return Buffer.from(part.inlineData.data, "base64");
    } catch (error) {
      if (attempt >= 3) throw error;
      console.warn(`  retry ${job.out} (${error instanceof Error ? error.message : error})`);
      await new Promise((r) => setTimeout(r, 4000 * attempt));
    }
  }
}

async function main(): Promise<void> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey: key });
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));
  const jobs = JOBS.filter((j) => (only.length ? only.includes(j.out) : true));
  const queue = jobs.filter((j) => force || only.length || !existsSync(`public/art/${j.out}.webp`));
  console.log(`generating ${queue.length} of ${jobs.length} images with ${MODEL}`);
  let i = 0;
  const workers = Array.from({ length: 3 }, async () => {
    while (i < queue.length) {
      const job = queue[i++];
      const raw = await generate(ai, job);
      const file = `public/art/${job.out}.webp`;
      mkdirSync(dirname(file), { recursive: true });
      const webp = await sharp(raw).resize({ width: job.width, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      writeFileSync(file, webp);
      console.log(`  ✓ ${job.out} (${Math.round(webp.length / 1024)} KB)`);
    }
  });
  await Promise.all(workers);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
