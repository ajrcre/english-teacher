import { z } from "zod";
import { HttpError, handler, json, parseBody, requireStudent } from "@/lib/api";
import { getCatalog } from "@/lib/content/catalog";
import { itemResponseSchema, sessionModeSchema } from "@/lib/responseSchema";
import { getServices } from "@/lib/services";

const body = z.object({
  itemId: z.string().max(200),
  response: itemResponseSchema,
  seconds: z.number().min(0).max(86_400),
  mode: sessionModeSchema,
  selfVerdict: z.enum(["correct", "incorrect"]).optional(),
});

export const POST = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  const ref = getCatalog().itemById.get(input.itemId);
  if (!ref) throw new HttpError(404, "Unknown question");
  if (ref.item.type !== input.response.type) throw new HttpError(400, "Answer does not match the question type");
  const { practice } = await getServices();
  return json(await practice.submitAnswer(session.studentId, input));
});
