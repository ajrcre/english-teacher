import { z } from "zod";
import { handler, json, parseBody, requireStudent } from "@/lib/api";
import { getServices } from "@/lib/services";

/** A lesson's boss, or (test: true) the Grey Fox of the switched-on class test. */
const body = z.union([z.object({ lessonId: z.string().max(100) }), z.object({ test: z.literal(true) })]);

/** Claims a boss victory; the server checks it against the recorded answers. */
export const POST = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  const { practice } = await getServices();
  return json("test" in input ? await practice.completeTestBoss(session.studentId) : await practice.completeBoss(session.studentId, input.lessonId));
});
