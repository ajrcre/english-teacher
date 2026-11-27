import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Runner } from "@/components/practice/Runner";
import { getCatalog } from "@/lib/content/catalog";
import type { SessionMode } from "@/lib/scheduling/sessionBuilder";
import { requireStudentPage } from "@/lib/student";

export const metadata: Metadata = { title: "Practice" };

const MODES: SessionMode[] = ["review", "explore", "lesson", "mistakes", "boss", "test-boss"];

export default async function PracticePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const mode = (MODES.includes(params.mode as SessionMode) ? params.mode : "review") as SessionMode;
  const { lessonById } = getCatalog();
  // Several chosen topics: ?mode=lesson&lessons=a,b,c (unknown ids are dropped).
  const lessonIds = mode === "lesson" && typeof params.lessons === "string" ? [...new Set(params.lessons.split(","))].filter((id) => lessonById.has(id)).slice(0, 40) : [];
  const lessonId = typeof params.lesson === "string" && !lessonIds.length ? params.lesson : undefined;
  const { student, services } = await requireStudentPage();
  let lessonTitle: string | undefined;
  let unitId: string | undefined;
  let bossReady = false;
  if (lessonIds.length) {
    const first = lessonById.get(lessonIds[0])!;
    lessonTitle = lessonIds.length === 1 ? `${first.unit.title} · ${first.lesson.title}` : `Your ${lessonIds.length} topics`;
  } else if (mode === "test-boss") {
    const fox = await services.practice.testBossStatus(student.id);
    if (!fox?.available) redirect("/home");
    lessonTitle = "The Grey Fox · test boss";
  } else if (mode === "lesson" || mode === "boss") {
    const ref = lessonId ? lessonById.get(lessonId) : undefined;
    if (!ref || !lessonId) redirect("/home");
    lessonTitle = `${ref.unit.title} · ${ref.lesson.title}`;
    unitId = ref.unit.id;
    const boss = await services.practice.bossStatus(student.id, lessonId);
    if (mode === "boss" && !boss.available) redirect(`/unit/${ref.unit.id}`);
    bossReady = boss.available;
  }
  return <Runner key={`${mode}:${lessonId ?? lessonIds.join(",")}`} mode={mode} lessonId={lessonId} lessonIds={lessonIds.length ? lessonIds : undefined} lessonTitle={lessonTitle} soundOn={student.soundOn} unitId={unitId} bossReady={bossReady} hat={student.hat} />;
}
