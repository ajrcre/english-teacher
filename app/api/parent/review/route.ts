import { z } from "zod";
import { handler, json, parseBody, requireParent } from "@/lib/api";
import { getCatalog } from "@/lib/content/catalog";
import { HttpError } from "@/lib/api";
import { getServices } from "@/lib/services";

const body = z.object({ itemId: z.string(), status: z.enum(["approved", "flagged"]), note: z.string().max(1000).nullable().optional() });

export const POST = handler(async (request: Request) => {
  const session = await requireParent();
  const input = await parseBody(request, body);
  if (!getCatalog().itemById.has(input.itemId)) throw new HttpError(404, "Unknown item");
  const { repos } = await getServices();
  await repos.flags.set(session.parentId, input.itemId, input.status, input.note ?? null);
  return json({ ok: true });
});
