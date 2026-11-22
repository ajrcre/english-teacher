import { z } from "zod";
import { HttpError, handler, json, parseBody, requireStudent } from "@/lib/api";
import { AVATARS } from "@/lib/avatars";
import { getCatalog } from "@/lib/content/catalog";
import { getServices } from "@/lib/services";

const body = z.object({
  focusUnit: z.string().max(60).nullable().optional(),
  soundOn: z.boolean().optional(),
  avatar: z.enum(AVATARS).optional(),
});

export const PATCH = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  if (input.focusUnit && !getCatalog().unitById.has(input.focusUnit)) throw new HttpError(404, "Unknown unit");
  const { repos } = await getServices();
  await repos.users.updateStudent(session.studentId, {
    ...(input.focusUnit !== undefined ? { focusUnit: input.focusUnit } : {}),
    ...(input.soundOn !== undefined ? { soundOn: input.soundOn } : {}),
    ...(input.avatar ? { avatar: input.avatar } : {}),
  });
  return json({ ok: true });
});
