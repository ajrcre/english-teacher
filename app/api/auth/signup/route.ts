import { z } from "zod";
import { hashSecret, newFamilyCode } from "@/lib/auth/passwords";
import { setSession } from "@/lib/auth/session";
import { HttpError, clientIp, handler, json, parseBody } from "@/lib/api";
import { logger } from "@/lib/logger";
import { getServices } from "@/lib/services";

const body = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
});

export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, body);
  const { repos } = await getServices();
  if (!(await repos.rateLimiter.hit(`signup:${clientIp(request)}`, 10, 3600))) throw new HttpError(429, "Too many attempts. Try again later.");
  if (await repos.users.findParentByEmail(input.email)) throw new HttpError(409, "An account with this email already exists.");
  let familyCode = newFamilyCode();
  while (await repos.users.findParentByFamilyCode(familyCode)) familyCode = newFamilyCode();
  const parent = await repos.users.createParent({ name: input.name, email: input.email, passwordHash: await hashSecret(input.password), familyCode });
  await setSession({ parentId: parent.id, role: "parent" });
  logger.info("parent signed up", { parentId: parent.id });
  return json({ ok: true, familyCode });
});
