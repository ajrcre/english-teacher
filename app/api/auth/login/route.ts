import { z } from "zod";
import { verifySecret } from "@/lib/auth/passwords";
import { setSession } from "@/lib/auth/session";
import { HttpError, clientIp, handler, json, parseBody } from "@/lib/api";
import { getServices } from "@/lib/services";

const body = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) });

export const POST = handler(async (request: Request) => {
  const input = await parseBody(request, body);
  const { repos } = await getServices();
  const key = `login:${input.email}:${clientIp(request)}`;
  if (!(await repos.rateLimiter.hit(key, 10, 900))) throw new HttpError(429, "Too many attempts. Wait 15 minutes and try again.");
  const parent = await repos.users.findParentByEmail(input.email);
  if (!parent || !(await verifySecret(parent.passwordHash, input.password))) throw new HttpError(401, "Email or password is incorrect.");
  await repos.rateLimiter.clear(key);
  await setSession({ parentId: parent.id, role: "parent" });
  return json({ ok: true });
});
