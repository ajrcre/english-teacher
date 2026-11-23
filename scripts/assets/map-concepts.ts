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

const NOVA = "Nova, a small friendly fox with amber-orange fur, a cream chest and cream-tipped bushy tail, dark brown socks on her legs, a teal scarf, and a small glowing paper lantern hanging from a short stick that she carries";
const SHEET = "The sheet has exactly 8 frames in 2 rows of 4, read left to right then top to bottom. Every frame is the same character at exactly the same size and scale, drawn with the same colours and design, evenly spaced with wide empty margins between frames so that nothing touches or overlaps. Natural, anatomically convincing animal movement with soft secondary motion in the tail, scarf and lantern.";

const NOVA_JOBS: Record<string, { aspect: string; size?: string; prompt: string }> = {
  "nova2-walk-side": {
    aspect: "16:9", size: "2K",
    prompt: `Animation sheet: a smooth 8-frame WALK CYCLE of ${NOVA}, seen from the SIDE facing right. A real four-legged fox gait: legs move in diagonal pairs, the head and shoulders dip and rise slightly, the tail floats level and sways, the scarf flutters back, the lantern swings gently. Frame 1: right front paw reaching forward and left hind paw pushing back (contact). Frame 2: body lowest, weight on the front leg. Frame 3: passing position, rear paw swinging forward under the body. Frame 4: body highest, one front paw lifted. Frames 5 to 8: the same four poses with the opposite legs leading, so that the loop is seamless. Each frame must show clearly different leg positions. ${SHEET} ${KEY} ${STYLE}`,
  },
  "nova2-walk-away": {
    aspect: "16:9", size: "2K",
    prompt: `Animation sheet: a smooth 8-frame WALK CYCLE of ${NOVA}, seen from BEHIND walking directly away from the viewer (back view, her tail and scarf toward the camera, ears visible, the lantern stick held to one side). The hips sway left and right and the rear paws alternate, lifting one after the other so the soles of her feet show in turn; the tail swishes slightly side to side. Frames 1 to 4 are one step with the left leg leading and frames 5 to 8 the next step with the right leg leading, a seamless loop. ${SHEET} ${KEY} ${STYLE}`,
  },
  "nova2-walk-toward": {
    aspect: "16:9", size: "2K",
    prompt: `Animation sheet: a smooth 8-frame WALK CYCLE of ${NOVA}, seen from the FRONT walking directly toward the viewer on ALL FOUR LEGS like a real fox (she is NOT standing upright): head and chest toward the camera, ears up, a happy expression, the lantern stick carried in her mouth and hanging to one side, the scarf visible at her chest, the tail visible behind her. The front paws alternate stepping toward the viewer, the shoulders sway left and right and the head dips slightly with each step. Frames 1 to 4 are one step with the left front leg leading and frames 5 to 8 the next step with the right front leg leading, a seamless loop. ${SHEET} ${KEY} ${STYLE}`,
  },
  "nova2-sleep": {
    aspect: "1:1", size: "2K",
    prompt: `A single illustration of ${NOVA}, curled up fast asleep on the ground in a tight comfortable ball, nose tucked under her bushy tail, eyes closed, the scarf loose around her neck, her little lantern set down beside her with a very dim, soft glow. Side three-quarter view, one fox only, with generous empty margins. ${KEY} ${STYLE}`,
  },
  "nova2-trot-side": {
    aspect: "16:9", size: "2K",
    prompt: `Animation sheet: a lively 8-frame TROT / light RUN CYCLE of ${NOVA}, seen from the SIDE facing right. Ears back, body stretched, the scarf and tail streaming behind, the lantern swinging; in two of the frames all four paws are briefly off the ground. A convincing, energetic fox run that loops seamlessly. ${SHEET} ${KEY} ${STYLE}`,
  },
  "nova2-poses": {
    aspect: "16:9", size: "2K",
    prompt: `Character pose sheet of ${NOVA}, showing 8 different idle behaviours, each one clearly different: (1) sitting calmly facing the viewer, tail curled around her paws; (2) sitting and looking up at the sky with her lantern raised; (3) sniffing the ground, nose low, side view facing right; (4) a stretching play-bow with her front down and rear up, side view facing right; (5) sitting and scratching behind her ear with a hind paw; (6) a pounce, leaping through the air, side view facing right; (7) a big happy yawn while sitting; (8) standing on her hind legs waving hello with one paw. ${SHEET} ${KEY} ${STYLE}`,
  },
};

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
    Object.entries({ ...JOBS, ...NOVA_JOBS })
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
