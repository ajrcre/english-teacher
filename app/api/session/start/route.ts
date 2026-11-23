import { z } from "zod";
import { HttpError, handler, json, parseBody, requireStudent } from "@/lib/api";
import { getCatalog } from "@/lib/content/catalog";
import { sessionModeSchema } from "@/lib/responseSchema";
import { getServices } from "@/lib/services";

const body = z.object({ mode: sessionModeSchema, lessonId: z.string().max(100).nullable().optional() });

export const POST = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  if ((input.mode === "lesson" || input.mode === "boss") && (!input.lessonId || !getCatalog().lessonById.has(input.lessonId))) throw new HttpError(404, "Lesson not found");
  const { repos, practice } = await getServices();
  const student = await repos.users.findStudent(session.studentId);
  if (!student) throw new HttpError(401, "Please sign in");
  if (input.mode === "boss" && !(await practice.bossStatus(student.id, input.lessonId!)).available) throw new HttpError(409, "Practise this lesson a little more to unlock its boss");
  return json(await practice.startSession(student.id, { mode: input.mode, lessonId: input.lessonId, focusUnitId: student.focusUnit }));
});
