import Link from "next/link";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { BOSS_RULES } from "@/lib/gamification/collection";
import { bossFor } from "@/lib/pixel/sprites/bosses";
import { heartEmpty, heartFull } from "@/lib/pixel/sprites/ui";
import { cx } from "@/lib/ui";

export interface BossTileInfo {
  available: boolean;
  seen: number;
  needed: number;
  bestHearts: number | null;
}

/** The boss gate beside a lesson: locked (silhouette), ready to fight, or beaten. */
export function BossTile({ unitId, lessonId, lessonTitle, boss }: { unitId: string; lessonId: string; lessonTitle: string; boss: BossTileInfo }) {
  if (!boss.needed) return null;
  const def = bossFor(unitId);
  const beaten = boss.bestHearts !== null;
  const body = (
    <>
      <span className={cx("relative grid h-[52px] w-[52px] place-items-center", boss.available && !beaten && "px-anim")} style={boss.available && !beaten ? { animation: "px-bob 1.4s ease-in-out infinite" } : undefined}>
        <PixelSprite sprite={def.sprite} scale={1.3} fps={boss.available ? 4 : 0} silhouette={!boss.available} className={cx(!boss.available && "text-ink-600")} />
      </span>
      <span className="block text-[11px] leading-tight">
        {beaten ? (
          <span className="flex justify-center gap-[2px]" aria-label={`Beaten with ${boss.bestHearts} hearts`}>
            {Array.from({ length: BOSS_RULES.hearts }, (_, i) => (
              <PixelSprite key={i} sprite={i < (boss.bestHearts ?? 0) ? heartFull : heartEmpty} scale={1} />
            ))}
          </span>
        ) : boss.available ? (
          <span className="text-[#ead39b]">FIGHT!</span>
        ) : (
          <span className="text-ink-400">
            {boss.seen}/{boss.needed}
          </span>
        )}
      </span>
    </>
  );
  const cls = "pixel-panel flex w-[76px] shrink-0 flex-col items-center justify-center gap-1 self-stretch px-1 py-2 text-center font-pixel";
  if (!boss.available)
    return (
      <div className={cx(cls, "opacity-80")} title={`Practise ${Math.max(0, boss.needed - boss.seen)} more questions to unlock the boss`} aria-label={`Boss locked: practise ${Math.max(0, boss.needed - boss.seen)} more questions in ${lessonTitle}`}>
        {body}
      </div>
    );
  return (
    <Link href={`/practice?mode=boss&lesson=${encodeURIComponent(lessonId)}`} className={cx(cls, "transition hover:brightness-110")} aria-label={`${beaten ? "Fight again" : "Fight"} ${def.name} in ${lessonTitle}`}>
      {body}
    </Link>
  );
}
