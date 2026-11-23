import type { Metadata } from "next";
import { BadgeIcon } from "@/components/pixel/BadgeIcon";
import { ProfileSettings } from "@/components/ProfileSettings";
import { LevelRing, StudentHeader } from "@/components/StudentHeader";
import { BADGES } from "@/lib/gamification/badges";
import { requireStudentPage } from "@/lib/student";
import { cx } from "@/lib/ui";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { student, services } = await requireStudentPage();
  const [{ stats, statsRaw, badges, units }, owned] = await Promise.all([services.practice.overview(student.id), services.rewards.owned(student.id)]);
  const earned = new Map(badges.map((b) => [b.id, b.earnedAt]));
  const mastered = units.reduce((a, u) => a + u.mastered, 0);
  const total = units.reduce((a, u) => a + u.total, 0);
  const accuracy = statsRaw.answersTotal ? Math.round((statsRaw.answersCorrect / statsRaw.answersTotal) * 100) : 0;

  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6">
        <StudentHeader name={student.name} avatar={student.avatar} frame={student.frame} stats={stats} back={{ href: "/home", label: "Sky" }} />

        <section className="mt-8 flex items-center gap-5">
          <LevelRing progress={stats.progress} level={stats.level} size={88} />
          <div>
            <p className="eyebrow text-amber-400">Level {stats.level}</p>
            <h1 className="font-display text-3xl font-semibold">{stats.title}</h1>
            <p className="text-sm text-ink-300">
              {stats.xp} XP · {Math.max(0, stats.nextLevelXp - stats.xp)} to level {stats.level + 1}
            </p>
          </div>
        </section>

        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Mastered", `${mastered} / ${total}`],
            ["Best streak", `${statsRaw.bestStreak} ${statsRaw.bestStreak === 1 ? "day" : "days"}`],
            ["Best combo", String(statsRaw.bestCombo)],
            ["Accuracy", `${accuracy}%`],
            ["Mistakes fixed", String(statsRaw.mistakesFixed)],
            ["Stars earned", String(statsRaw.stars)],
            ["Bosses beaten", String(statsRaw.bossesDefeated)],
            ["Streak shields", String(statsRaw.shields)],
            ["Answers", String(statsRaw.answersTotal)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-white/10 bg-ink-800 p-3">
              <dt className="text-xs uppercase tracking-wider text-ink-400">{k}</dt>
              <dd className="mt-1 font-display text-xl font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Badges</h2>
          <p className="text-sm text-ink-300">
            {earned.size} of {BADGES.length} collected
          </p>
          <ul className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-4">
            {BADGES.map((b) => {
              const got = earned.has(b.id);
              return (
                <li key={b.id} className="text-center">
                  <BadgeIcon badge={{ icon: b.icon, pixel: b.pixel }} earned={got} size={80} />
                  <div className={cx("mt-2 text-sm font-semibold", !got && "text-ink-400")}>{b.title}</div>
                  <div className="text-xs text-ink-400">{b.description}</div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-2xl font-semibold">Settings</h2>
          <div className="mt-4">
            <ProfileSettings name={student.name} avatar={student.avatar} frame={student.frame} soundOn={student.soundOn} ownedAvatars={owned.avatars} ownedFrames={owned.frames} />
          </div>
        </section>
      </div>
    </main>
  );
}
