import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Art, StarGlyph } from "@/components/Art";
import { BossTile } from "@/components/pixel/BossTile";
import { StudentHeader } from "@/components/StudentHeader";
import { getCatalog } from "@/lib/content/catalog";
import { requireStudentPage } from "@/lib/student";
import { ACCENTS, unitArt } from "@/lib/ui";

export async function generateMetadata({ params }: { params: Promise<{ unitId: string }> }): Promise<Metadata> {
  const { unitId } = await params;
  return { title: getCatalog().unitById.get(unitId)?.title ?? "Unit" };
}

export default async function UnitPage({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  if (!getCatalog().unitById.has(unitId)) notFound();
  const { student, services } = await requireStudentPage();
  const { units, stats } = await services.practice.overview(student.id);
  const unit = units.find((u) => u.id === unitId)!;
  const accent = ACCENTS[unit.accent]?.hex ?? "#f2a93b";

  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6">
        <StudentHeader name={student.name} avatar={student.avatar} frame={student.frame} stats={stats} back={{ href: "/home", label: "Sky" }} />

        <section className="relative mt-6 overflow-hidden rounded-[var(--radius-card)] border border-white/10">
          <Art src={unitArt(unit.id)} alt="" className="aspect-[21/9] w-full object-cover" fallback={<span />} />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="eyebrow" style={{ color: accent }}>
              {unit.mastered}/{unit.total} mastered
            </p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">{unit.title}</h1>
            <p className="text-ink-200">{unit.tagline}</p>
          </div>
        </section>
        {unit.note && <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-ink-200">{unit.note}</p>}

        <ol className="mt-6 space-y-3">
          {unit.lessons.map((l, i) => {
            const pct = l.total ? l.mastered / l.total : 0;
            const lit = pct >= 1;
            return (
              <li key={l.id} className="flex items-stretch gap-2">
                <Link href={`/practice?mode=lesson&lesson=${encodeURIComponent(l.id)}`} className="flex min-w-0 flex-1 items-center gap-4 rounded-2xl border border-white/10 bg-ink-800 p-4 transition hover:bg-ink-700">
                  <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: lit ? accent : "rgb(255 255 255 / 0.06)" }}>
                    <StarGlyph className="h-6 w-6" filled={lit || pct > 0} />
                    {!lit && <span className="absolute -bottom-1 -right-1 rounded-full bg-ink-900 px-1.5 text-[10px] font-bold text-ink-300">{i + 1}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.title}</div>
                    <div className="truncate text-sm text-ink-300">{l.subtitle ?? l.source}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: accent }} />
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs text-ink-300">
                    <div className="font-bold text-paper-100">{Math.round(pct * 100)}%</div>
                    <div>{l.total} items</div>
                  </div>
                </Link>
                <BossTile unitId={unit.id} lessonId={l.id} lessonTitle={l.title} boss={l.boss} />
              </li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
