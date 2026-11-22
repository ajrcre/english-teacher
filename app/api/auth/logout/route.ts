import { clearSession } from "@/lib/auth/session";
import { handler, json } from "@/lib/api";

export const POST = handler(async () => {
  await clearSession();
  return json({ ok: true });
});
