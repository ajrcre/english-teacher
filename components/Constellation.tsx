/** A unit drawn as a constellation: one star per lesson, brighter as it is mastered. */
export interface StarPoint {
  id: string;
  title: string;
  /** 0..1 mastery */
  value: number;
  seen: boolean;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function layoutStars(unitId: string, n: number): { x: number; y: number }[] {
  // A gentle wandering path across the box, jittered per unit so each constellation looks different.
  const pts: { x: number; y: number }[] = [];
  let h = hash(unitId);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const cols = Math.min(n, 7);
  const rows = Math.ceil(n / cols);
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const colRaw = i % cols;
    const col = row % 2 === 0 ? colRaw : cols - 1 - colRaw; // snake
    const x = ((col + 0.5) / cols) * 100 + (rand() - 0.5) * (60 / cols);
    const y = ((row + 0.5) / Math.max(rows, 1)) * 100 + (rand() - 0.5) * (50 / Math.max(rows, 1));
    pts.push({ x: Math.min(94, Math.max(6, x)), y: Math.min(90, Math.max(10, y)) });
  }
  return pts;
}

export function Constellation({ unitId, stars, accent, className }: { unitId: string; stars: StarPoint[]; accent: string; className?: string }) {
  const pts = layoutStars(unitId, stars.length);
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="none" className={className} aria-hidden="true">
      <g transform="scale(1 0.6)">
        {pts.slice(1).map((p, i) => (
          <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} stroke="white" strokeOpacity={0.14} strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
        ))}
        {stars.map((s, i) => {
          const lit = s.value;
          const r = 1.4 + lit * 1.8;
          return (
            <g key={s.id}>
              {lit > 0 && <circle cx={pts[i].x} cy={pts[i].y} r={r * 2.6} fill={accent} opacity={0.12 + lit * 0.25} />}
              <circle cx={pts[i].x} cy={pts[i].y} r={r} fill={lit >= 1 ? accent : s.seen ? "#e8edf4" : "transparent"} fillOpacity={lit >= 1 ? 1 : 0.35 + lit * 0.6} stroke={lit >= 1 ? accent : "#9fb1c9"} strokeWidth={0.35} vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
