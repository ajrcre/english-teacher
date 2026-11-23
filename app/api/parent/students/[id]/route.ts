import { z } from "zod";
import { hashSecret } from "@/lib/auth/passwords";
import { HttpError, handler, json, parseBody, requireParent } from "@/lib/api";
import { testById } from "@/content/tests";
import { AVATARS } from "@/lib/avatars";
import { getServices } from "@/lib/services";

const body = z.object({
  name: z.string().trim().min(1).max(40).optional(),
  avatar: z.enum(AVATARS).optional(),
  pin: z.string().regex(/^\d{4}$/).optional(),
  focusUnit: z.string().max(60).nullable().optional(),
  activeTest: z.string().max(60).nullable().optional(),
});

async function ownStudent(id: string) {
  const session = await requireParent();
  const { repos } = await getServices();
  const student = await repos.users.findStudent(id);
  if (!student || student.parentId !== session.parentId) throw new HttpError(404, "Student not found");
  return { repos, student };
}

export const PATCH = handler(async (request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { repos } = await ownStudent(id);
  const input = await parseBody(request, body);
  if (input.activeTest && !testById(input.activeTest)) throw new HttpError(400, "Unknown test");
  await repos.users.updateStudent(id, {
    ...(input.name ? { name: input.name } : {}),
    ...(input.avatar ? { avatar: input.avatar } : {}),
    ...(input.pin ? { pinHash: await hashSecret(input.pin) } : {}),
    ...(input.focusUnit !== undefined ? { focusUnit: input.focusUnit } : {}),
    ...(input.activeTest !== undefined ? { activeTest: input.activeTest } : {}),
  });
  return json({ ok: true });
});

export const DELETE = handler(async (_request: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { repos } = await ownStudent(id);
  await repos.users.deleteStudent(id);
  return json({ ok: true });
});
