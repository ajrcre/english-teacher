/**
 * Concept audio for the adventure map: footsteps per surface, ambient loops per area, bird calls.
 * Writes MP3s to .concepts/audio/ for review (not part of the app until approved).
 *   npx tsx scripts/assets/gen-map-audio.ts [name...] [--force]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const KEY = process.env.ELEVENLABS_API_KEY;
const NO_MUSIC = "Realistic field recording, no music, no voices, no speech.";

interface Job { text: string; seconds: number; loop?: boolean }

const NO_HOOF = "No hollow thump, no knock, no clop, no hoof sounds, no heavy impact. Very close microphone, quiet, delicate, a single step only, nothing else in the recording.";
// Prompts are deliberately about texture (crunch, rustle, squeak) rather than "a paw hitting the ground", which came out as hooves.
const STEP_PROMPTS: Record<string, string> = {
  dirt: `One light, soft footstep of a small fox walking on a gravel path: a gentle dry crunch of tiny stones shifting under a soft paw. ${NO_HOOF} ${NO_MUSIC}`,
  grass: `One very soft footstep on dry fallen forest leaves: a quiet crisp rustle and faint crackle of leaves under a light paw, delicate. ${NO_HOOF} ${NO_MUSIC}`,
  snow: `One soft footstep of a small animal in fresh powdery snow: a faint squeaky crunch with a muffled compress. ${NO_HOOF} ${NO_MUSIC}`,
  wood: `One very light, muffled footstep of a small animal on an old mossy wooden bridge: a soft pad with a tiny dry creak of the plank. ${NO_HOOF} ${NO_MUSIC}`,
};
// A second wording for wood (candidates 7-12): the first batch came out too tonal, like a knock.
const WOOD_ALT = `A faint dry scuff and a soft airy creak, as a small light animal pads across old weathered boards. Mostly texture and rasp, almost no tone. ${NO_HOOF} ${NO_MUSIC}`;
const JOBS: Record<string, Job> = {};
for (const [name, text] of Object.entries(STEP_PROMPTS)) {
  for (let i = 1; i <= 6; i++) JOBS[`step-${name}-${i}`] = { text, seconds: 0.5 };
}
for (let i = 7; i <= 12; i++) JOBS[`step-wood-${i}`] = { text: WOOD_ALT, seconds: 0.5 };
Object.assign(JOBS, {
  "amb-meadow": { loop: true, seconds: 22, text: `Clearly audible spring morning birdsong in a countryside meadow: several songbirds singing and calling to each other at different distances, with a soft steady breeze rustling through grass and leaves. Rich, natural, peaceful, medium volume. ${NO_MUSIC} Seamless loop.` },
  "amb-river": { loop: true, seconds: 22, text: `A small clear stream flowing over pebbles, gentle babbling brook close by. Calm and constant. ${NO_MUSIC} Seamless loop.` },
  "amb-sea": { loop: true, seconds: 22, text: `A calm small harbour: gentle waves lapping against a wooden dock and boat hull, soft creaking of ropes, a couple of distant seagulls. ${NO_MUSIC} Seamless loop.` },
  "amb-snow": { loop: true, seconds: 22, text: `A cold quiet snowy pine forest: soft whistling wind through the trees, very faint snow settling, wide empty winter stillness. ${NO_MUSIC} Seamless loop.` },
  "amb-bees": { loop: true, seconds: 22, text: `Bees buzzing softly around a blossoming tree on a warm day, a gentle constant hum of many bees, light breeze. ${NO_MUSIC} Seamless loop.` },
  "amb-workshop": { loop: true, seconds: 22, text: `Clearly audible old clockwork machinery: large brass gears slowly turning with a steady tick-tock, soft metallic clicks, a gentle hiss of steam and creaking wood, as heard standing next to an inventor's workshop. Medium volume. ${NO_MUSIC} Seamless loop.` },
  "amb-cave": { loop: true, seconds: 22, text: `Inside a quiet cave: slow water drops with a soft echo, low airy resonance, faint delicate glassy shimmer of crystals. Mysterious but gentle. ${NO_MUSIC} Seamless loop.` },
  "bird-1": { seconds: 3, text: `A single songbird singing a short cheerful phrase of three or four notes outdoors, close but not loud. ${NO_MUSIC}` },
  "bird-2": { seconds: 3, text: `A small bird chirping twice and then fluttering its wings as it flies away. ${NO_MUSIC}` },
  "bird-3": { seconds: 3, text: `A distant cuckoo calling twice in a quiet meadow. ${NO_MUSIC}` },
} satisfies Record<string, Job>);

async function make(name: string, job: Job): Promise<void> {
  const body: Record<string, unknown> = { text: job.text, duration_seconds: job.seconds, prompt_influence: 0.55, model_id: "eleven_text_to_sound_v2" };
  if (job.loop) body.loop = true;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_96", {
      method: "POST",
      headers: { "xi-api-key": KEY!, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      writeFileSync(`.concepts/audio/${name}.mp3`, Buffer.from(await res.arrayBuffer()));
      console.log(`✓ ${name}`);
      return;
    }
    const text = await res.text();
    if (res.status === 400 && body.loop) { delete body.loop; console.warn(`  ${name}: loop not accepted, retrying without`); continue; }
    if (res.status === 400 && body.model_id) { delete body.model_id; console.warn(`  ${name}: model not accepted (${text.slice(0, 120)}), retrying default`); continue; }
    if (/quota/i.test(text)) throw new Error(`ElevenLabs quota reached: ${text.slice(0, 200)}`);
    if (res.status === 429 || res.status >= 500) { await new Promise((r) => setTimeout(r, 2000 * attempt)); continue; }
    throw new Error(`${name}: ${res.status} ${text.slice(0, 200)}`);
  }
  console.error(`✗ ${name}`);
}

async function main(): Promise<void> {
  if (!KEY) throw new Error("ELEVENLABS_API_KEY is not set");
  mkdirSync(".concepts/audio", { recursive: true });
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));
  const todo = Object.entries(JOBS).filter(([n]) => (!only.length || only.includes(n)) && (force || !existsSync(`.concepts/audio/${n}.mp3`)));
  console.log(`generating ${todo.length} sounds`);
  let i = 0;
  await Promise.all(Array.from({ length: 3 }, async () => { while (i < todo.length) { const [n, j] = todo[i++]; await make(n, j); } }));
}

main().catch((e: unknown) => { console.error(e); process.exit(1); });
