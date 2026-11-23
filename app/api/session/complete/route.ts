import { z } from "zod";
import { handler, json, parseBody, requireStudent } from "@/lib/api";
import { getCatalog } from "@/lib/content/catalog";
import { sessionModeSchema } from "@/lib/responseSchema";
import { getServices } from "@/lib/services";

const body = z.object({ mode: sessionModeSchema, answered: z.number().int().min(0).max(500), lessonId: z.string().max(100).nullable().optional() });

export const POST = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  const { practice } = await getServices();
  const result = await practice.completeRound(session.studentId, { mode: input.mode, answered: input.answered });
  // After lesson practice, say whether the lesson's boss is now unlocked.
  const boss = input.mode === "lesson" && input.lessonId && getCatalog().lessonById.has(input.lessonId) ? await practice.bossStatus(session.studentId, input.lessonId) : null;
  return json({ ...result, bossReady: boss?.available ?? false });
});
