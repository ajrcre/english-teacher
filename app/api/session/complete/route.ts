import { z } from "zod";
import { handler, json, parseBody, requireStudent } from "@/lib/api";
import { sessionModeSchema } from "@/lib/responseSchema";
import { getServices } from "@/lib/services";

const body = z.object({ mode: sessionModeSchema, answered: z.number().int().min(0).max(500) });

export const POST = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  const { practice } = await getServices();
  return json(await practice.completeRound(session.studentId, input));
});
