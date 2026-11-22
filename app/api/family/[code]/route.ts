import { normalizeFamilyCode } from "@/lib/auth/passwords";
import { HttpError, clientIp, handler, json } from "@/lib/api";
import { getServices } from "@/lib/services";

/** Lists a family's student profiles (names and avatars only) for the PIN sign-in screen. */
export const GET = handler(async (request: Request, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = await ctx.params;
  const { repos } = await getServices();
  if (!(await repos.rateLimiter.hit(`family:${clientIp(request)}`, 30, 600))) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
  const parent = await repos.users.findParentByFamilyCode(normalizeFamilyCode(code));
  if (!parent) throw new HttpError(404, "We couldn't find that family code.");
  const students = await repos.users.listStudents(parent.id);
  return json({ familyCode: parent.familyCode, students: students.map((s) => ({ id: s.id, name: s.name, avatar: s.avatar })) });
});
