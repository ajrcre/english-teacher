import { z } from "zod";
import { hashSecret } from "@/lib/auth/passwords";
import { HttpError, handler, json, parseBody, requireParent } from "@/lib/api";
import { getServices } from "@/lib/services";
import { AVATARS } from "@/lib/avatars";

const body = z.object({
  name: z.string().trim().min(1).max(40),
  avatar: z.enum(AVATARS),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
  focusUnit: z.string().max(60).nullable().optional(),
});

export const POST = handler(async (request: Request) => {
  const session = await requireParent();
  const input = await parseBody(request, body);
  const { repos } = await getServices();
  const existing = await repos.users.listStudents(session.parentId);
  if (existing.length >= 6) throw new HttpError(400, "A family can have up to 6 students.");
  const student = await repos.users.createStudent({ parentId: session.parentId, name: input.name, avatar: input.avatar, pinHash: await hashSecret(input.pin), focusUnit: input.focusUnit ?? null });
  return json({ id: student.id });
});
