/** Level n starts at 50·n·(n−1) XP: 0, 100, 300, 600, 1000, 1500, … */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

const TITLES: [number, string][] = [
  [1, "Stargazer"],
  [3, "Lantern Bearer"],
  [5, "Pathfinder"],
  [8, "Navigator"],
  [12, "Storyteller"],
  [16, "Wordsmith"],
  [20, "Star Captain"],
  [25, "Keeper of Memories"],
  [32, "Constellation Master"],
];

export function titleForLevel(level: number): string {
  let title = TITLES[0][1];
  for (const [min, t] of TITLES) if (level >= min) title = t;
  return title;
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number;
  /** 0..1 progress through the current level. */
  progress: number;
}

export function levelInfo(xp: number): LevelInfo {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, title: titleForLevel(level), xp, levelStartXp: start, nextLevelXp: next, progress: (xp - start) / (next - start) };
}
