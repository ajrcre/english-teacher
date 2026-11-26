import type { Metadata } from "next";
import Link from "next/link";
import { Art } from "@/components/Art";
import { FocusPicker } from "@/components/FocusPicker";
import { AdventureMap, type MapPlace } from "@/components/map/AdventureMap";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { PLACES } from "@/components/map/layout";
import { StudentHeader } from "@/components/StudentHeader";
import { TopicPicker, type TopicGroup } from "@/components/TopicPicker";
import { stickerArt } from "@/lib/pixel/sprites/stickers";
import { chests, pixelStar } from "@/lib/pixel/sprites/ui";
import { DAILY_RULES } from "@/lib/services/practice";
import { requireStudentPage } from "@/lib/student";
import { cx, minutes } from "@/lib/ui";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const { student, services } = await requireStudentPage();
  const [{ units, stats, daily, test }, album] = await Promise.all([services.practice.overview(student.id), services.rewards.album(student.id)]);
  const lastSticker = [...album.stickers].reverse().find((st) => st.count > 0);
  const target = DAILY_RULES.dailyTargetSeconds;
  const pct = Math.min(1, daily.secondsToday / target);
  const roundsDone = daily.roundsToday;
  const places: MapPlace[] = units
    .filter((u) => u.id in PLACES)
    .map((u) => ({ id: u.id, name: u.title, tagline: u.tagline, lit: u.lessons.filter((l) => l.total > 0 && l.mastered >= l.total).length, total: u.lessons.length, mastery: u.total ? u.mastered / u.total : 0 }));
  // The test's topics, grouped by unit (in the test's order).
  const testGroups: TopicGroup[] = [];
  for (const l of test?.lessons ?? []) {
    let g = testGroups.find((x) => x.title === l.unitTitle);
    if (!g) testGroups.push((g = { id: l.unitTitle, title: l.unitTitle, lessons: [] }));
    g.lessons.push(l);
  }
  const allGroups: TopicGroup[] = units.map((u) => ({ id: u.id, title: u.title, lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, total: l.total, mastered: l.mastered })) }));
  const startId = student.focusUnit && student.focusUnit in PLACES ? student.focusUnit : "the-giver";

  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-5 sm:px-6">
        <StudentHeader name={student.name} avatar={student.avatar} frame={student.frame} stats={stats} />

        {test && (
          <section aria-labelledby="test-prep" className="mt-6 rounded-[var(--radius-card)] border border-amber-400/40 bg-ink-800 p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div>
                <p className="eyebrow text-amber-400">Test prep</p>
                <h2 id="test-prep" className="mt-1 font-display text-xl font-semibold sm:text-2xl">
                  {test.title} · {new Date(`${test.date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
                </h2>
              </div>
              <p className="font-display text-lg font-semibold text-amber-300">{test.daysLeft <= 0 ? "Test day!" : test.daysLeft === 1 ? "Tomorrow" : `${test.daysLeft} days to go`}</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Test questions mastered" aria-valuenow={Math.round((test.mastered / Math.max(1, test.total)) * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${(test.mastered / Math.max(1, test.total)) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-ink-300">
              {test.mastered} of {test.total} questions mastered · {Math.max(0, test.seen - test.mastered)} still being learned · {Math.max(0, test.total - test.seen)} not started
            </p>
            <p className="mt-1 text-sm text-ink-300">Your rounds now use only the topics on this test.{test.notInApp.length > 0 && ` Not practised here: ${test.notInApp.join(", ")}.`}</p>
            {testGroups.length > 0 && (
              <details className="group mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <summary className="cursor-pointer list-none font-semibold text-amber-300 marker:hidden">
                  <span className="mr-1 inline-block transition group-open:rotate-90">▸</span> Practise only some of the test topics
                </summary>
                <div className="mt-3">
                  <TopicPicker groups={testGroups} storageKey={`test:${test.id}`} defaultAll tone="amber" />
                </div>
              </details>
            )}
          </section>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10">
          <div className="paper-card relative overflow-hidden p-4 sm:p-6 lg:col-start-1 lg:row-start-1 lg:self-start">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-amber-700">Today's mission</p>
                <h1 className="mt-1 font-display text-xl font-semibold leading-tight sm:text-3xl">
                  {daily.done ? "Mission complete!" : roundsDone >= 1 ? "One more round?" : "Two rounds, twenty minutes"}
                </h1>
                <p className="mt-1 text-sm text-text-soft sm:text-base">
                  {minutes(daily.secondsToday)} of {minutes(target)} minutes
                  {daily.goalMet ? " · daily goal met" : " · finish one round to keep your streak"}
                </p>
              </div>
              <Art src="/art/mascot/idle.webp" alt="" className="hidden h-24 w-24 shrink-0 rounded-2xl object-cover sm:block" fallback={<span />} />
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-paper-200" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Minutes today">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct * 100}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link href="/practice?mode=review" className={cx("group rounded-2xl border-2 p-3 transition sm:p-4", roundsDone >= 1 ? "border-teal-400 bg-[#e7f6f3]" : "border-ink-800 bg-ink-800 text-paper-100 hover:bg-ink-700")}>
                <div className="eyebrow opacity-70">Round 1</div>
                <div className="mt-1 font-display text-lg font-semibold sm:text-xl">Review</div>
                <div className="mt-1 text-xs opacity-80 sm:text-sm">{daily.dueCount > 0 ? `${daily.dueCount} cards waiting` : "Warm up with a mix"}</div>
              </Link>
              <Link href="/practice?mode=explore" className={cx("rounded-2xl border-2 p-3 transition sm:p-4", roundsDone >= 2 ? "border-teal-400 bg-[#e7f6f3]" : "border-paper-300 bg-paper-50 hover:border-ink-400")}>
                <div className="eyebrow text-text-soft">Round 2</div>
                <div className="mt-1 font-display text-lg font-semibold sm:text-xl">Explore</div>
                <div className="mt-1 text-xs text-text-soft sm:text-sm">New questions + a little spelling</div>
              </Link>
            </div>
          </div>

          <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <h2 className="mt-2 font-display text-2xl font-semibold lg:mt-0">Your adventure</h2>
            <p className="mb-4 mt-1 hidden text-sm text-ink-300 sm:block">Every place is a unit. Master its questions to light every star.</p>
            <AdventureMap places={places} startId={startId} soundOn={student.soundOn} />
          </div>

          <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2 lg:self-start">
            <Link href={daily.mistakeCount ? "/practice?mode=mistakes" : "#"} aria-disabled={!daily.mistakeCount} className={cx("rounded-[var(--radius-card)] border border-white/10 bg-ink-800 p-5 transition", daily.mistakeCount ? "hover:bg-ink-700" : "pointer-events-none opacity-70")}>
              <p className="eyebrow text-rose-300">Mistake gym</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold">{daily.mistakeCount}</span>
                <span className="text-ink-300">{daily.mistakeCount === 1 ? "item to fix" : "items to fix"}</span>
              </div>
              <p className="mt-1 text-sm text-ink-300">{daily.mistakeCount ? "They come back until you've got them for good." : "Nothing to fix right now. Nice!"}</p>
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/shop" className="pixel-panel flex flex-col items-start gap-2 p-4 font-pixel transition hover:brightness-110">
                <span className="text-xs uppercase tracking-widest text-[#ead39b]">Star shop</span>
                <span className="flex items-center gap-2 text-2xl text-[#ece4d6]">
                  <PixelSprite sprite={pixelStar} scale={3} />
                  {stats.starsBalance}
                </span>
                <span className="text-xs text-[#a99cc4]">Avatars, frames, shields</span>
              </Link>
              <Link href="/album" className="pixel-panel flex flex-col items-start gap-2 p-4 font-pixel transition hover:brightness-110">
                <span className="text-xs uppercase tracking-widest text-[#ead39b]">Sticker album</span>
                <span className="flex items-center gap-2 text-2xl text-[#ece4d6]">
                  <PixelSprite sprite={lastSticker ? stickerArt(lastSticker.id) : chests.wood.closed} scale={2} />
                  {album.collected}/{album.total}
                </span>
                <span className="text-xs text-[#a99cc4]">Win chests to collect</span>
              </Link>
            </div>
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-ink-800 p-5">
              {test ? (
                <p className="text-sm text-ink-300">Test prep is on, so new material comes only from the test topics.</p>
              ) : (
                <>
                  <FocusPicker units={units.map((u) => ({ id: u.id, title: u.title }))} value={student.focusUnit} />
                  <p className="mt-2 text-xs text-ink-400">Pick what your class is studying now.</p>
                </>
              )}
              <details className="group mt-4 border-t border-white/10 pt-3">
                <summary className="cursor-pointer list-none font-semibold text-amber-300 marker:hidden">
                  <span className="mr-1 inline-block transition group-open:rotate-90">▸</span> Choose topics to practise
                </summary>
                <p className="mt-1 text-xs text-ink-400">Tick a few topics from any unit and practise just those.</p>
                <div className="mt-2">
                  <TopicPicker groups={allGroups} storageKey="all" scroll />
                </div>
              </details>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
