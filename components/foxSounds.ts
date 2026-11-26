"use client";

import { soundEnabled } from "./sound";

/**
 * The Grey Fox's 8-bit sounds, made in code with Web Audio (no files): chip-tune blips for his
 * talking, a whoosh when he throws a bubble, glassy tinkles when it shatters, a little arpeggio
 * when a right answer pops it, and a poof and a boing when he's beaten and his hat drops.
 * Silent when sound is off.
 */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (!soundEnabled() || typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(a: AudioContext): AudioBuffer {
  if (!noise) {
    noise = a.createBuffer(1, a.sampleRate * 0.6, a.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** One square/triangle tone with a quick envelope, sliding from `f0` to `f1` Hz. */
function tone(a: AudioContext, at: number, dur: number, f0: number, f1 = f0, type: OscillatorType = "square", vol = 0.07): void {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(a.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/** A burst of filtered noise; the filter sweeps from `f0` to `f1` Hz. */
function hiss(a: AudioContext, at: number, dur: number, f0: number, f1: number, vol = 0.12, type: BiquadFilterType = "bandpass"): void {
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a);
  const filter = a.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(f0, at);
  filter.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + dur * 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(a.destination);
  src.start(at);
  src.stop(at + dur + 0.02);
}

/** He speaks: a few low, flat chip-tune blips (a poker face has a monotone voice). */
export function foxTalk(): void {
  const a = audio();
  if (!a) return;
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const f = 180 + Math.random() * 70;
    tone(a, a.currentTime + i * 0.085, 0.06, f, f * 0.95, "square", 0.05);
  }
}

/** He throws a bubble: a rising whoosh. */
export function foxThrow(): void {
  const a = audio();
  if (!a) return;
  hiss(a, a.currentTime, 0.32, 400, 2600, 0.1);
  tone(a, a.currentTime + 0.05, 0.2, 220, 520, "triangle", 0.04);
}

/** The bubble shatters on Nova (or a grey star is caught): a crunch and glassy tinkles. */
export function bubbleShatter(): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  hiss(a, t, 0.18, 3000, 900, 0.16, "highpass");
  for (let i = 0; i < 4; i++) tone(a, t + 0.03 + i * 0.045, 0.09, 1900 + Math.random() * 1400, 1500, "triangle", 0.035);
  tone(a, t, 0.25, 140, 70, "square", 0.05);
}

/** A right answer pops his bubble: a quick rising arpeggio. */
export function bubblePop(): void {
  const a = audio();
  if (!a) return;
  [523, 659, 784, 1047].forEach((f, i) => tone(a, a.currentTime + i * 0.06, 0.09, f, f, "square", 0.045));
}

/** Nova's hit lands on him: a short falling tone. */
export function foxHurt(): void {
  const a = audio();
  if (!a) return;
  tone(a, a.currentTime, 0.18, 330, 150, "square", 0.05);
}

/** Beaten: he vanishes in a poof, with a little chime. */
export function foxVanish(): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  hiss(a, t, 0.5, 2000, 200, 0.14, "lowpass");
  [784, 988, 1319].forEach((f, i) => tone(a, t + 0.2 + i * 0.08, 0.16, f, f, "triangle", 0.04));
}

/** His hat lands on the ground: boing. */
export function hatBoing(): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  tone(a, t, 0.16, 200, 520, "square", 0.05);
  tone(a, t + 0.16, 0.12, 380, 240, "square", 0.035);
}
