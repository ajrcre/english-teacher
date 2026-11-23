import { z } from "zod";
import { handler, json, parseBody, requireStudent } from "@/lib/api";
import { getServices } from "@/lib/services";

const body = z.object({ lessonId: z.string().max(100) });

/** Claims a boss victory; the server checks it against the recorded answers. */
export const POST = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  const { practice } = await getServices();
  return json(await practice.completeBoss(session.studentId, input.lessonId));
});
