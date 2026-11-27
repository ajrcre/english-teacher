/**
 * The Grey Fox's 8-bit battle music, as data (pure, shared by the player and tests).
 *
 * Each mood is a 4-bar loop written in eighth notes: a note name ("A4", "C#5", "Bb3"),
 * "." for a rest, or "~" to hold the note before. Drums: "k" kick, "s" snare, "h" hi-hat.
 * - calm: a spooky castle tune in A minor;
 * - angry (half his lives gone): the same tune an octave up, faster, with busier drums;
 * - showdown (his last life, the lights out): slow and tense, a heartbeat kick and long notes.
 */

export type FoxMood = "calm" | "angry" | "showdown";

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** A note name ("A4", "C#5", "Bb3") as a MIDI number (A4 = 69). */
export function midi(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Not a note: ${name}`);
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + acc;
}

/** A MIDI note's frequency in Hz. */
export function hz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** A note to play: from eighth `at`, for `len` eighths. */
export interface NoteEvent {
  at: number;
  note: number;
  len: number;
}

/** Turns a line of eighths ("A4 ~ . C5 | …", bars split by "|") into notes. */
export function parseLine(line: string, transpose = 0): NoteEvent[] {
  const tokens = line.split(/[\s|]+/).filter(Boolean);
  const out: NoteEvent[] = [];
  tokens.forEach((t, i) => {
    if (t === ".") return;
    if (t === "~") {
      const last = out[out.length - 1];
      if (last && last.at + last.len === i) last.len += 1;
      return;
    }
    out.push({ at: i, note: midi(t) + transpose, len: 1 });
  });
  return out;
}

/** How many eighths a line has. */
export function lineLength(line: string): number {
  return line.split(/[\s|]+/).filter(Boolean).length;
}

export const EIGHTHS_PER_BAR = 8;
export const LOOP_EIGHTHS = EIGHTHS_PER_BAR * 4;

const CALM_LEAD = "A4 . C5 E5 D5 . C5 B4 | A4 . E4 . A4 B4 C5 . | F4 . A4 C5 B4 . A4 G#4 | A4 ~ ~ . E4 . . .";
const BASS = "A2 A3 A2 A3 A2 A3 A2 A3 | A2 A3 A2 A3 G2 G3 G2 G3 | F2 F3 F2 F3 E2 E3 E2 E3 | A2 A3 A2 A3 E2 E3 E2 E3";

export interface Mood {
  bpm: number;
  lead: string;
  /** Semitones to move the lead (the angry tune is the calm one, higher). */
  leadUp: number;
  bass: string;
  drums: string;
  /** Loudness of the lead (the showdown is quieter, tenser). */
  leadVol: number;
}

export const MOODS: Record<FoxMood, Mood> = {
  calm: {
    bpm: 132,
    lead: CALM_LEAD,
    leadUp: 0,
    bass: BASS,
    drums: "k h s h k h s h | k h s h k h s h | k h s h k h s h | k h s h k k s s",
    leadVol: 0.05,
  },
  angry: {
    bpm: 160,
    lead: CALM_LEAD,
    leadUp: 12,
    bass: BASS,
    drums: "k h s h k k s h | k h s h k k s h | k h s h k k s h | k s k s k s s s",
    leadVol: 0.045,
  },
  showdown: {
    bpm: 96,
    lead: "E5 ~ ~ ~ . . . . | D5 ~ ~ ~ . . . . | C5 ~ ~ ~ . . B4 . | B4 ~ ~ ~ ~ ~ . .",
    leadUp: 0,
    bass: "A1 ~ ~ ~ ~ ~ ~ ~ | A1 ~ ~ ~ ~ ~ ~ ~ | F1 ~ ~ ~ ~ ~ ~ ~ | E1 ~ ~ ~ ~ ~ ~ ~",
    drums: "k k . . . . . . | k k . . . . . . | k k . . . . . . | k k . . . . h h",
    leadVol: 0.035,
  },
};

/** Short tunes when the battle ends: a rising fanfare, or falling notes when he gets away. */
export const JINGLES = {
  win: { bpm: 180, lead: "C5 E5 G5 C6 ~ ~ ~ ." },
  lose: { bpm: 110, lead: "E4 D#4 D4 C#4 ~ ~ ~ ." },
};

/** The music's mood for where the battle stands. */
export function foxMusicMood(hits: number, hp: number): FoxMood {
  const left = hp - hits;
  if (hp > 0 && left === 1) return "showdown";
  if (hp > 0 && hits >= Math.ceil(hp / 2)) return "angry";
  return "calm";
}
