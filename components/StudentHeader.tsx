import Link from "next/link";
import { Avatar, StarGlyph } from "@/components/Art";
import type { StatsSummary } from "@/lib/services/practice";

export function LevelRing({ progress, level, size = 52 }: { progress: number; level: number; size?: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" stroke="var(--color-amber-400)" strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
      </svg>
      <span className="font-display text-lg font-semibold">{level}</span>
    </div>
  );
}

export function StudentHeader({ name, avatar, frame, stats, back }: { name: string; avatar: string; frame?: string | null; stats: StatsSummary; back?: { href: string; label: string } }) {
  return (
    <header className="flex items-center gap-3">
      {back ? (
        <Link href={back.href} className="btn btn-ghost h-11 min-h-0 px-4 text-sm">
          ← {back.label}
        </Link>
      ) : (
        <Link href="/profile" className="flex items-center gap-3" aria-label="Your profile">
          <Avatar avatar={avatar} name={name} size={44} frame={frame} />
          <div className="leading-tight">
            <div className="font-semibold">{name}</div>
            <div className="text-xs text-ink-300">{stats.title}</div>
          </div>
        </Link>
      )}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm font-bold" title="Day streak">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-400" aria-hidden="true">
            <path fill="currentColor" d="M12 2c1 3.5 4.5 5.4 4.5 9.6A4.5 4.5 0 0 1 12 16a4.5 4.5 0 0 1-4.5-4.4c0-1.6.7-2.8 1.5-3.8.2 1.4 1 2.3 2 2.6C10.2 7.8 11 4.8 12 2Zm-6 13.5C6 19.1 8.7 22 12 22s6-2.9 6-6.5c0-.7-.1-1.4-.3-2-1 2.6-3.2 4.5-5.7 4.5s-4.7-1.9-5.7-4.5c-.2.6-.3 1.3-.3 2Z" />
          </svg>
          <span>{stats.streak}</span>
          <span className="sr-only">day streak</span>
        </div>
        <Link href="/shop" className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-sm font-bold transition hover:bg-white/10" title="Stars to spend in the shop">
          <StarGlyph className="h-4 w-4 text-amber-300" />
          <span>{stats.starsBalance}</span>
          <span className="sr-only">stars to spend — open the shop</span>
        </Link>
        <Link href="/profile" aria-label={`Level ${stats.level}`}>
          <LevelRing progress={stats.progress} level={stats.level} size={44} />
        </Link>
      </div>
    </header>
  );
}
