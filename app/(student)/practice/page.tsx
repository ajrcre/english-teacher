import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Runner } from "@/components/practice/Runner";
import { getCatalog } from "@/lib/content/catalog";
import type { SessionMode } from "@/lib/scheduling/sessionBuilder";
import { requireStudentPage } from "@/lib/student";

export const metadata: Metadata = { title: "Practice" };

const MODES: SessionMode[] = ["review", "explore", "lesson", "mistakes"];

export default async function PracticePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const mode = (MODES.includes(params.mode as SessionMode) ? params.mode : "review") as SessionMode;
  const lessonId = typeof params.lesson === "string" ? params.lesson : undefined;
  const { student } = await requireStudentPage();
  let lessonTitle: string | undefined;
  if (mode === "lesson") {
    const ref = lessonId ? getCatalog().lessonById.get(lessonId) : undefined;
    if (!ref) redirect("/home");
    lessonTitle = `${ref.unit.title} · ${ref.lesson.title}`;
  }
  return <Runner key={`${mode}:${lessonId ?? ""}`} mode={mode} lessonId={lessonId} lessonTitle={lessonTitle} soundOn={student.soundOn} />;
}
