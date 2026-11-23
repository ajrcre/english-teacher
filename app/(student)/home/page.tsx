import type { Metadata } from "next";
import Link from "next/link";
import { Art } from "@/components/Art";
import { Constellation } from "@/components/Constellation";
import { FocusPicker } from "@/components/FocusPicker";
import { StudentHeader } from "@/components/StudentHeader";
import { DAILY_RULES } from "@/lib/services/practice";
import { requireStudentPage } from "@/lib/student";
import { ACCENTS, cx, minutes, unitArt } from "@/lib/ui";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const { student, services } = await requireStudentPage();
  const { units, stats, daily } = await services.practice.overview(student.id);
  const target = DAILY_RULES.dailyTargetSeconds;
  const pct = Math.min(1, daily.secondsToday / target);
  const roundsDone = daily.roundsToday;

  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6">
        <StudentHeader name={student.name} avatar={student.avatar} stats={stats} />

        <section className="mt-8 grid gap-4 md:grid-cols-[1.35fr_1fr]">
          <div className="paper-card relative overflow-hidden p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-amber-700">Today's mission</p>
                <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">
                  {daily.done ? "Mission complete!" : roundsDone >= 1 ? "One more round?" : "Two rounds, twenty minutes"}
                </h1>
                <p className="mt-1 text-text-soft">
                  {minutes(daily.secondsToday)} of {minutes(target)} minutes
                  {daily.goalMet ? " · daily goal met" : " · finish one round to keep your streak"}
                </p>
              </div>
              <Art src="/art/mascot/idle.webp" alt="" className="hidden h-24 w-24 shrink-0 rounded-2xl object-cover sm:block" fallback={<span />} />
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-paper-200" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Minutes today">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct * 100}%` }} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link href="/practice?mode=review" className={cx("group rounded-2xl border-2 p-4 transition", roundsDone >= 1 ? "border-teal-400 bg-[#e7f6f3]" : "border-ink-800 bg-ink-800 text-paper-100 hover:bg-ink-700")}>
                <div className="eyebrow opacity-70">Round 1</div>
                <div className="mt-1 font-display text-xl font-semibold">Review</div>
                <div className="mt-1 text-sm opacity-80">{daily.dueCount > 0 ? `${daily.dueCount} cards waiting` : "Warm up with a mix"}</div>
              </Link>
              <Link href="/practice?mode=explore" className={cx("rounded-2xl border-2 p-4 transition", roundsDone >= 2 ? "border-teal-400 bg-[#e7f6f3]" : "border-paper-300 bg-paper-50 hover:border-ink-400")}>
                <div className="eyebrow text-text-soft">Round 2</div>
                <div className="mt-1 font-display text-xl font-semibold">Explore</div>
                <div className="mt-1 text-sm text-text-soft">New questions + a little spelling</div>
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Link href={daily.mistakeCount ? "/practice?mode=mistakes" : "#"} aria-disabled={!daily.mistakeCount} className={cx("rounded-[var(--radius-card)] border border-white/10 bg-ink-800 p-5 transition", daily.mistakeCount ? "hover:bg-ink-700" : "pointer-events-none opacity-70")}>
              <p className="eyebrow text-rose-300">Mistake gym</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold">{daily.mistakeCount}</span>
                <span className="text-ink-300">{daily.mistakeCount === 1 ? "item to fix" : "items to fix"}</span>
              </div>
              <p className="mt-1 text-sm text-ink-300">{daily.mistakeCount ? "They come back until you've got them for good." : "Nothing to fix right now. Nice!"}</p>
            </Link>
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-ink-800 p-5">
              <FocusPicker units={units.map((u) => ({ id: u.id, title: u.title }))} value={student.focusUnit} />
              <p className="mt-2 text-xs text-ink-400">Pick what your class is studying now.</p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Your sky</h2>
          <p className="text-sm text-ink-300">Every lesson is a star. Master its questions to light it up.</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {units.map((u) => {
              const accent = ACCENTS[u.accent]?.hex ?? "#f2a93b";
              const pctUnit = u.total ? Math.round((u.mastered / u.total) * 100) : 0;
              const lit = u.lessons.filter((l) => l.mastered >= l.total).length;
              return (
                <li key={u.id}>
                  <Link href={`/unit/${u.id}`} className="group block overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-ink-800 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <Art src={unitArt(u.id)} alt="" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" fallback={<span />} />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-800 via-ink-800/40 to-transparent" />
                      <Constellation unitId={u.id} stars={u.lessons.map((l) => ({ id: l.id, title: l.title, value: l.total ? l.mastered / l.total : 0, seen: l.seen > 0 }))} accent={accent} className="absolute inset-x-3 bottom-2 h-[55%] w-[calc(100%-1.5rem)]" />
                    </div>
                    <div className="p-4 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-xl font-semibold">{u.title}</h3>
                        <span className="text-xs font-bold" style={{ color: accent }}>
                          {pctUnit}%
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-ink-300">{u.tagline}</p>
                      <p className="mt-2 text-xs text-ink-400">
                        {lit}/{u.lessons.length} stars lit
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </main>
  );
}
