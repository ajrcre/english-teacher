import type { Metadata } from "next";
import { PRIVATE_PAGE } from "@/lib/site";
import Link from "next/link";
import { Logo } from "@/components/Art";
import { getCatalog } from "@/lib/content/catalog";
import { requireParentPage } from "@/lib/student";
import { cx } from "@/lib/ui";
import { ReviewButtons } from "./ReviewButtons";

export const metadata: Metadata = { title: "Review answer keys", robots: PRIVATE_PAGE };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ unit?: string }> }) {
  const { parent, services } = await requireParentPage();
  const catalog = getCatalog();
  const { unit: unitParam } = await searchParams;
  const unitsWithDrafts = catalog.units.filter((u) => u.lessons.some((l) => l.items.some((i) => i.reviewStatus === "draft")));
  const unit = unitsWithDrafts.find((u) => u.id === unitParam) ?? unitsWithDrafts[0];
  const flags = new Map((await services.repos.flags.list(parent.id)).map((f) => [f.itemId, f]));

  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/parent" className="text-sm font-semibold text-ink-300 hover:text-paper-100">
            ← Dashboard
          </Link>
        </header>
        <h1 className="mt-8 font-display text-3xl font-semibold">Review answer keys</h1>
        <p className="mt-2 text-ink-300">
          These answers were written for the app because the workbook has no key. Students see them only after answering. Flag anything that doesn't
          match the book or what the teacher expects.
        </p>
        <nav className="mt-5 flex flex-wrap gap-2">
          {unitsWithDrafts.map((u) => (
            <Link key={u.id} href={`/parent/review?unit=${u.id}`} className={cx("rounded-full px-4 py-1.5 text-sm font-semibold", u.id === unit?.id ? "bg-amber-400 text-ink-900" : "bg-white/5 text-ink-200 hover:bg-white/10")}>
              {u.title}
            </Link>
          ))}
        </nav>
        {unit?.lessons.map((lesson) => {
          const drafts = lesson.items.filter((i) => i.reviewStatus === "draft");
          if (!drafts.length) return null;
          return (
            <section key={lesson.id} className="mt-8">
              <h2 className="font-display text-xl font-semibold">{lesson.title}</h2>
              <ul className="mt-3 space-y-3">
                {drafts.map((item) => {
                  const flag = flags.get(item.id);
                  return (
                    <li key={item.id} className="rounded-2xl border border-white/10 bg-ink-800 p-4">
                      <div className="font-semibold">{item.type === "open" ? item.question : "prompt" in item ? item.prompt : item.id}</div>
                      {item.type === "open" && (
                        <>
                          <p className="mt-2 text-ink-200">{item.expected}</p>
                          <ul className="mt-2 list-disc pl-5 text-sm text-ink-300">
                            {item.keyPoints.map((k) => (
                              <li key={k}>{k}</li>
                            ))}
                          </ul>
                        </>
                      )}
                      {item.type === "match" && (
                        <ul className="mt-2 text-sm text-ink-200">
                          {item.pairs.map(([a, b]) => (
                            <li key={a}>
                              {a} → {b}
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.type === "sequence" && (
                        <ol className="mt-2 list-decimal pl-5 text-sm text-ink-200">
                          {item.steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                      )}
                      {item.source && <p className="mt-2 text-xs text-ink-400">{item.source}</p>}
                      <ReviewButtons itemId={item.id} initial={(flag?.status as "approved" | "flagged") ?? null} initialNote={flag?.note ?? null} />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
