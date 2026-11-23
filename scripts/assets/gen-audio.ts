/**
 * Generates all audio with ElevenLabs into public/audio:
 *   sfx/<name>.mp3                 — game sound effects
 *   words/<slug>.mp3               — pronunciation for every vocabulary word ("speak")
 *   dictation/<audioId>-w.mp3/-s.mp3 — spelling words and their sentences (opaque names)
 * Existing files are skipped, so the script can be re-run after a quota error.
 *
 *   npx tsx scripts/assets/gen-audio.ts [sfx|words|dictation] [--force]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { audioSlug, dictationAudioId } from "@/lib/content/client";

const API = "https://api.elevenlabs.io/v1";
/** "Bella" — clear, warm, American educational voice. */
const VOICE = process.env.ELEVENLABS_VOICE_ID ?? "hpp4J3VqNfWAUOO0d1Us";
const MODEL = process.env.ELEVENLABS_MODEL ?? "eleven_multilingual_v2";
const FORMAT = "mp3_44100_64";

const SFX: Record<string, { text: string; seconds: number }> = {
  correct: { text: "short bright magical chime, two quick rising notes, soft and pleasant success sound for a children's learning game", seconds: 0.8 },
  wrong: { text: "soft gentle low wooden 'boop', two descending notes, kind and not harsh, for a wrong answer in a children's learning game", seconds: 0.7 },
  combo: { text: "quick sparkling ascending arpeggio of glockenspiel notes, exciting streak sound", seconds: 1.2 },
  levelup: { text: "short triumphant celebratory fanfare with chimes and a magical whoosh, level up in a game", seconds: 2.2 },
  badge: { text: "warm magical shimmer with a bell, achievement unlocked sound", seconds: 1.6 },
  streak: { text: "cosy crackling flame whoosh followed by a soft bright chime", seconds: 1.5 },
  tap: { text: "very short soft paper tap click, subtle user interface sound", seconds: 0.5 },
  star: { text: "twinkling star sparkle, delicate high bell glissando, magical and calm", seconds: 1.5 },
};

class QuotaError extends Error {}

async function post(path: string, body: object): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}${path}${path.includes("?") ? "&" : "?"}output_format=${FORMAT}`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const text = await res.text();
    if (res.status === 401 && /quota/i.test(text)) throw new QuotaError(text);
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
}

const tts = (text: string, speed = 0.9) =>
  post(`/text-to-speech/${VOICE}`, { text, model_id: MODEL, voice_settings: { stability: 0.65, similarity_boost: 0.8, speed } });

function save(file: string, data: Buffer): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, data);
}

async function runAll(tasks: { file: string; make: () => Promise<Buffer> }[], force: boolean, workers = 3): Promise<void> {
  const todo = tasks.filter((t) => force || !existsSync(t.file));
  console.log(`  ${todo.length} to generate (${tasks.length - todo.length} already exist)`);
  let i = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: workers }, async () => {
      while (i < todo.length) {
        const t = todo[i++];
        save(t.file, await t.make());
        if (++done % 50 === 0) console.log(`  … ${done}/${todo.length}`);
      }
    }),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const parts = args.filter((a) => !a.startsWith("--"));
  const want = (p: string) => !parts.length || parts.includes(p);
  const catalog = buildCatalog(units);

  if (want("sfx")) {
    console.log("sound effects");
    await runAll(
      Object.entries(SFX).map(([name, s]) => ({
        file: `public/audio/sfx/${name}.mp3`,
        make: () => post("/sound-generation", { text: s.text, duration_seconds: s.seconds, prompt_influence: 0.6 }),
      })),
      force,
      2,
    );
  }

  if (want("words")) {
    console.log("vocabulary words");
    const words = new Set<string>();
    for (const { item } of catalog.entries) if (item.speak && item.type !== "dictation") words.add(item.speak);
    await runAll([...words].map((w) => ({ file: `public/audio/words/${audioSlug(w)}.mp3`, make: () => tts(w, 0.85) })), force);
  }

  if (want("dictation")) {
    console.log("spelling dictation");
    const tasks: { file: string; make: () => Promise<Buffer> }[] = [];
    for (const { item } of catalog.entries) {
      if (item.type !== "dictation") continue;
      const id = dictationAudioId(item.id);
      tasks.push({ file: `public/audio/dictation/${id}-w.mp3`, make: () => tts(item.word, 0.8) });
      tasks.push({ file: `public/audio/dictation/${id}-s.mp3`, make: () => tts(item.sentence, 0.9) });
    }
    await runAll(tasks, force);
  }
  console.log("done");
}

main().catch((e: unknown) => {
  if (e instanceof QuotaError) console.error("ElevenLabs quota reached — re-run later to continue (existing files are kept).");
  console.error(e);
  process.exit(1);
});
