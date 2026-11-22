import { z } from "zod";
import { normalizeFamilyCode, verifySecret } from "@/lib/auth/passwords";
import { setSession } from "@/lib/auth/session";
import { HttpError, handler, json, parseBody } from "@/lib/api";
import { getServices } from "@/lib/services";

const body = z.object({ familyCode: z.string().min(4).max(20), studentId: z.string().uuid(), pin: z.string().regex(/^\d{4}$/) });

export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, body);
  const { repos } = await getServices();
  const key = `pin:${input.studentId}`;
  if (!(await repos.rateLimiter.hit(key, 8, 900))) throw new HttpError(429, "Too many wrong PINs. Ask a parent, or wait 15 minutes.");
  const parent = await repos.users.findParentByFamilyCode(normalizeFamilyCode(input.familyCode));
  const student = await repos.users.findStudent(input.studentId);
  if (!parent || !student || student.parentId !== parent.id || !(await verifySecret(student.pinHash, input.pin))) {
    throw new HttpError(401, "That PIN isn't right. Try again.");
  }
  await repos.rateLimiter.clear(key);
  await setSession({ parentId: parent.id, studentId: student.id, role: "student" });
  return json({ ok: true });
});
