import "server-only";
import type { Catalog } from "@/lib/content/catalog";
import { addDays } from "@/lib/time";
import type { Services } from "./index";

function questionText(catalog: Catalog, itemId: string): string {
  const item = catalog.itemById.get(itemId)?.item;
  if (!item) return itemId;
  switch (item.type) {
    case "open":
      return item.question;
    case "dictation":
      return `Spell “${item.word}”`;
    default:
      return "sentence" in item && item.sentence ? `${item.prompt} — ${item.sentence}` : item.prompt;
  }
}

function responseText(response: unknown): string {
  const r = response as Record<string, unknown>;
  if (typeof r.text === "string") return r.text;
  if (typeof r.choice === "string") return r.choice;
  if (Array.isArray(r.order)) return (r.order as string[]).join(" → ");
  if (Array.isArray(r.pairs)) return (r.pairs as [string, string][]).map(([a, b]) => `${a} = ${b}`).join("; ");
  if (r.placement && typeof r.placement === "object") return Object.entries(r.placement as Record<string, string>).map(([a, b]) => `${a}: ${b}`).join("; ");
  return "";
}

/** Everything the parent dashboard shows for one family. */
export async function parentOverview(services: Services, catalog: Catalog, parentId: string, today: string) {
  const students = await services.repos.users.listStudents(parentId);
  const since = addDays(today, -13);
  return Promise.all(
    students.map(async (s) => {
      const [overview, days, attempts] = await Promise.all([
        services.practice.overview(s.id),
        services.repos.progress.recentDays(s.id, since),
        services.repos.progress.recentAttempts(s.id, 60),
      ]);
      const byDay = new Map(days.map((d) => [d.day, d]));
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const day = addDays(since, i);
        const d = byDay.get(day);
        return { day, minutes: Math.round((d?.seconds ?? 0) / 60), answers: d?.answers ?? 0, correct: d?.correct ?? 0, goal: (d?.roundsCompleted ?? 0) >= 1 };
      });
      const mistakes = attempts
        .filter((a) => a.verdict !== "correct")
        .slice(0, 8)
        .map((a) => ({
          id: a.id,
          question: questionText(catalog, a.itemId),
          answer: responseText(a.response),
          when: a.createdAt,
          unit: catalog.itemById.get(a.itemId)?.unitId,
        }));
      return {
        student: { id: s.id, name: s.name, avatar: s.avatar, focusUnit: s.focusUnit },
        stats: overview.stats,
        raw: overview.statsRaw,
        daily: overview.daily,
        units: overview.units.map((u) => ({ id: u.id, title: u.title, accent: u.accent, total: u.total, mastered: u.mastered, seen: u.lessons.reduce((a, l) => a + l.seen, 0) })),
        last14,
        mistakes,
        badges: overview.badges.length,
      };
    }),
  );
}
