import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Logo } from "@/components/Art";
import { MinutesChart } from "@/components/MinutesChart";
import { getCatalog } from "@/lib/content/catalog";
import { parentOverview } from "@/lib/services/parent";
import { requireParentPage } from "@/lib/student";
import { tests } from "@/content/tests";
import { dayKey } from "@/lib/time";
import { ACCENTS } from "@/lib/ui";
import { CopyCode } from "./CopyCode";
import { AddStudentForm, SignOutButton, StudentActions } from "./ParentControls";

export const metadata: Metadata = { title: "Parent dashboard" };

export default async function ParentDashboard() {
  const { parent, services } = await requireParentPage();
  const catalog = getCatalog();
  const today = dayKey(new Date());
  const family = await parentOverview(services, catalog, parent.id, today);
  const upcomingTests = tests.filter((t) => t.date >= today).map((t) => ({ id: t.id, label: `${t.title} · ${new Date(`${t.date}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}` }));
  const units = catalog.units.map((u) => ({ id: u.id, title: u.title }));
  const drafts = catalog.entries.filter((e) => e.item.reviewStatus === "draft").length;
  const flags = await services.repos.flags.list(parent.id);

  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <Logo />
          <SignOutButton />
        </header>

        <section className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-amber-400">Parent dashboard</p>
            <h1 className="font-display text-3xl font-semibold">Hello, {parent.name}</h1>
          </div>
          <div className="rounded-2xl border border-white/10 bg-ink-800 px-4 py-3">
            <div className="text-xs uppercase tracking-wider text-ink-400">Family code</div>
            <CopyCode code={parent.familyCode} />
            <div className="text-xs text-ink-400">Students type this at starlight sign-in</div>
          </div>
        </section>

        <div className="mt-6">
          <AddStudentForm units={units} />
        </div>

        {family.length === 0 && <p className="mt-6 text-ink-300">Add your first student to get started.</p>}

        <ul className="mt-6 space-y-6">
          {family.map(({ student, stats, raw, daily, units: u, last14, mistakes, badges }) => {
            const accuracy = raw.answersTotal ? Math.round((raw.answersCorrect / raw.answersTotal) * 100) : 0;
            const week = last14.slice(-7).reduce((a, d) => a + d.minutes, 0);
            return (
              <li key={student.id} className="rounded-[var(--radius-card)] border border-white/10 bg-ink-800 p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar avatar={student.avatar} name={student.name} size={56} />
                  <div className="flex-1">
                    <h2 className="font-display text-2xl font-semibold">{student.name}</h2>
                    <p className="text-sm text-ink-300">
                      Level {stats.level} · {stats.title} · {badges} badges
                    </p>
                  </div>
                  <StudentActions id={student.id} name={student.name} focusUnit={student.focusUnit} activeTest={student.activeTest} tests={upcomingTests} units={units} />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {[
                    ["Streak", `${raw.streak} ${raw.streak === 1 ? "day" : "days"}`],
                    ["This week", `${week} min`],
                    ["Today", `${Math.round(daily.secondsToday / 60)} / 20 min`],
                    ["Accuracy", `${accuracy}%`],
                    ["To fix", String(daily.mistakeCount)],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-white/5 p-3">
                      <dt className="text-xs uppercase tracking-wider text-ink-400">{k}</dt>
                      <dd className="mt-0.5 font-display text-xl font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-200">Minutes per day</h3>
                    <div className="mt-6">
                      <MinutesChart data={last14} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-200">Mastery by unit</h3>
                    <ul className="mt-3 space-y-2.5">
                      {u.map((unit) => {
                        const pct = unit.total ? unit.mastered / unit.total : 0;
                        return (
                          <li key={unit.id}>
                            <div className="flex justify-between text-sm">
                              <span>{unit.title}</span>
                              <span className="text-ink-300">
                                {unit.mastered}/{unit.total}
                              </span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                              <div className="h-full rounded-r-[4px]" style={{ width: `${pct * 100}%`, background: ACCENTS[unit.accent]?.hex }} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-ink-200">Recent mistakes</h3>
                  {mistakes.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-400">No mistakes yet.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-white/5 text-sm">
                      {mistakes.map((m) => (
                        <li key={m.id} className="py-2">
                          <div className="text-ink-200">{m.question}</div>
                          <div className="text-ink-400">
                            Answered: <span className="text-rose-300">{m.answer || "—"}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <section className="mt-10 rounded-[var(--radius-card)] border border-white/10 bg-ink-800 p-5">
          <h2 className="font-display text-xl font-semibold">Answer keys to check</h2>
          <p className="mt-1 text-sm text-ink-300">
            The workbook has no answer key for most novel questions, so {drafts} answers were written for the app. You can check them and flag anything
            that doesn't match what the teacher expects. {flags.length > 0 && `You've reviewed ${flags.length} so far.`}
          </p>
          <Link href="/parent/review" className="btn btn-ghost mt-4">
            Review answer keys
          </Link>
        </section>
      </div>
    </main>
  );
}
