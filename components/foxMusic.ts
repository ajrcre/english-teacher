"use client";

import { EIGHTHS_PER_BAR, hz, JINGLES, LOOP_EIGHTHS, MOODS, parseLine, type FoxMood, type NoteEvent } from "@/lib/game/foxMusic";
import { foxAudioContext, noiseBuffer } from "./foxSounds";

/**
 * Plays the Grey Fox's 8-bit battle music (made in code, see lib/game/foxMusic.ts). A small
 * scheduler queues the notes a moment ahead on the audio clock, so the music keeps time.
 * A change of mood waits for the next bar. Silent when sound is off or music is muted.
 */
const MUSIC_KEY = "starlight.music";
const AHEAD = 0.15;
const VOLUME = 0.6;

let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let mood: FoxMood = "calm";
let wanted: FoxMood = "calm";
let step = 0;
let nextAt = 0;
let parsed: { lead: NoteEvent[]; bass: NoteEvent[]; drums: string[] } | null = null;

/** Whether the music is on (per device; the sound setting must be on too). */
export function musicOn(): boolean {
  try {
    return localStorage.getItem(MUSIC_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setMusicOn(on: boolean): void {
  try {
    localStorage.setItem(MUSIC_KEY, on ? "on" : "off");
  } catch {
    /* private mode */
  }
  if (!on) stopFoxMusic();
}

function load(m: FoxMood) {
  const def = MOODS[m];
  parsed = {
    lead: parseLine(def.lead, def.leadUp),
    bass: parseLine(def.bass),
    drums: def.drums.split(/[\s|]+/).filter(Boolean),
  };
}

function voice(a: AudioContext, out: AudioNode, at: number, dur: number, f: number, type: OscillatorType, vol: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.setValueAtTime(vol, at + Math.max(0.02, dur * 0.7));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.02);
}

function drum(a: AudioContext, out: AudioNode, at: number, kind: string) {
  if (kind === "k") {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, at);
    o.frequency.exponentialRampToValueAtTime(40, at + 0.12);
    g.gain.setValueAtTime(0.12, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.14);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + 0.16);
    return;
  }
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const f = a.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = kind === "s" ? 1500 : 6000;
  const g = a.createGain();
  const len = kind === "s" ? 0.12 : 0.04;
  g.gain.setValueAtTime(kind === "s" ? 0.07 : 0.03, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  src.connect(f).connect(g).connect(out);
  src.start(at);
  src.stop(at + len + 0.02);
}

function tick() {
  const a = foxAudioContext();
  if (!a || !master || !parsed) return;
  if (nextAt < a.currentTime) nextAt = a.currentTime + 0.05;
  while (nextAt < a.currentTime + AHEAD) {
    // a new mood starts at the top of a bar
    if (step % EIGHTHS_PER_BAR === 0 && wanted !== mood) {
      mood = wanted;
      load(mood);
    }
    const def = MOODS[mood];
    const eighth = 60 / def.bpm / 2;
    for (const n of parsed.lead) if (n.at === step) voice(a, master, nextAt, n.len * eighth * 0.92, hz(n.note), "square", def.leadVol);
    for (const n of parsed.bass) if (n.at === step) voice(a, master, nextAt, n.len * eighth * 0.85, hz(n.note), "triangle", 0.09);
    const d = parsed.drums[step];
    if (d && d !== ".") drum(a, master, nextAt, d);
    nextAt += eighth;
    step = (step + 1) % LOOP_EIGHTHS;
  }
}

function onVisibility() {
  const a = foxAudioContext();
  if (!a || !timer) return;
  if (document.hidden) void a.suspend();
  else void a.resume();
}

function wake() {
  const a = foxAudioContext();
  if (a && a.state === "suspended" && !document.hidden) void a.resume();
}

/** Starts the music in a mood (does nothing if it is already playing, or sound/music is off). */
export function startFoxMusic(m: FoxMood = "calm"): void {
  wanted = m;
  if (timer || !musicOn()) return;
  const a = foxAudioContext();
  if (!a) return;
  master = a.createGain();
  master.gain.value = VOLUME;
  master.connect(a.destination);
  mood = m;
  load(mood);
  step = 0;
  nextAt = a.currentTime + 0.1;
  timer = setInterval(tick, 25);
  tick();
  // browsers may hold audio until the first tap or key
  window.addEventListener("pointerdown", wake);
  window.addEventListener("keydown", wake);
  document.addEventListener("visibilitychange", onVisibility);
}

/** Changes the mood at the next bar. */
export function setFoxMusicMood(m: FoxMood): void {
  wanted = m;
}

/** Stops the music, fading out quickly. */
export function stopFoxMusic(): void {
  if (timer) clearInterval(timer);
  timer = null;
  window.removeEventListener("pointerdown", wake);
  window.removeEventListener("keydown", wake);
  document.removeEventListener("visibilitychange", onVisibility);
  const a = foxAudioContext();
  if (master && a) {
    const g = master;
    g.gain.setTargetAtTime(0.0001, a.currentTime, 0.08);
    setTimeout(() => g.disconnect(), 600);
  }
  master = null;
}

/** The battle is over: the music stops and a short tune plays (a fanfare, or falling notes). */
export function playFoxJingle(kind: "win" | "lose"): void {
  stopFoxMusic();
  if (!musicOn()) return;
  const a = foxAudioContext();
  if (!a) return;
  const out = a.createGain();
  out.gain.value = VOLUME;
  out.connect(a.destination);
  const j = JINGLES[kind];
  const eighth = 60 / j.bpm / 2;
  const start = a.currentTime + 0.05;
  for (const n of parseLine(j.lead)) {
    voice(a, out, start + n.at * eighth, n.len * eighth * 0.95, hz(n.note), "square", 0.06);
    voice(a, out, start + n.at * eighth, n.len * eighth * 0.95, hz(n.note - 12), "triangle", 0.08);
  }
  setTimeout(() => out.disconnect(), 3000);
}
