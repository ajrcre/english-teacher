import { z } from "zod";
import { HttpError, handler, json, parseBody, requireStudent } from "@/lib/api";
import { getCatalog } from "@/lib/content/catalog";
import { getServices } from "@/lib/services";

const body = z.object({
  focusUnit: z.string().max(60).nullable().optional(),
  soundOn: z.boolean().optional(),
  avatar: z.string().max(40).optional(),
  frame: z.string().max(40).nullable().optional(),
  hat: z.string().max(40).nullable().optional(),
});

export const PATCH = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  if (input.focusUnit && !getCatalog().unitById.has(input.focusUnit)) throw new HttpError(404, "Unknown unit");
  const { repos, rewards } = await getServices();
  if ((input.avatar || input.frame || input.hat) && !(await rewards.canUse(session.studentId, { avatar: input.avatar, frame: input.frame, hat: input.hat }))) throw new HttpError(403, "You don't own that yet");
  await repos.users.updateStudent(session.studentId, {
    ...(input.frame !== undefined ? { frame: input.frame } : {}),
    ...(input.hat !== undefined ? { hat: input.hat } : {}),
    ...(input.focusUnit !== undefined ? { focusUnit: input.focusUnit } : {}),
    ...(input.soundOn !== undefined ? { soundOn: input.soundOn } : {}),
    ...(input.avatar ? { avatar: input.avatar } : {}),
  });
  return json({ ok: true });
});
