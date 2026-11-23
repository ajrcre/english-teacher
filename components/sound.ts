"use client";

/**
 * Sound effects and pronunciation. Pre-generated audio lives in /public/audio;
 * if a file is missing we fall back to the browser's speech synthesis for words
 * and stay silent for effects.
 */
export type Sfx = "correct" | "wrong" | "combo" | "levelup" | "badge" | "streak" | "tap" | "star";

const cache = new Map<string, HTMLAudioElement>();
let enabled = true;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

function audio(src: string): HTMLAudioElement {
  let a = cache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(src, a);
  }
  return a;
}

export function playSfx(name: Sfx, volume = 0.55): void {
  if (!enabled || typeof window === "undefined") return;
  const a = audio(`/audio/sfx/${name}.mp3`);
  a.volume = volume;
  a.currentTime = 0;
  void a.play().catch(() => undefined);
}

function speakWithBrowser(text: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = rate;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

function playFile(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const a = audio(src);
    a.volume = 1;
    a.currentTime = 0;
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
    a.play().catch(() => resolve(false));
  });
}

export function wordSlug(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Pronounce a vocabulary word (after answering). */
export async function speakWord(word: string): Promise<void> {
  const ok = await playFile(`/audio/words/${wordSlug(word)}.mp3`);
  if (!ok) await speakWithBrowser(word, 0.85);
}

/**
 * Play a dictation item (the word, or the word in a sentence). Audio files are
 * addressed by an opaque id; if a file is missing, the server gives us the text
 * for the browser's speech synthesis.
 */
export async function playDictation(itemId: string, audioId: string, part: "word" | "sentence"): Promise<void> {
  const ok = await playFile(`/audio/dictation/${audioId}-${part === "word" ? "w" : "s"}.mp3`);
  if (ok) return;
  try {
    const res = await fetch(`/api/session/dictation?itemId=${encodeURIComponent(itemId)}&part=${part}`);
    if (!res.ok) return;
    const { text } = (await res.json()) as { text: string };
    await speakWithBrowser(text, part === "word" ? 0.8 : 0.9);
  } catch {
    /* offline: nothing to play */
  }
}
