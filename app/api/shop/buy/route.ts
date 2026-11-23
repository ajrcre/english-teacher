import { z } from "zod";
import { handler, json, parseBody, requireStudent } from "@/lib/api";
import { getServices } from "@/lib/services";

const body = z.object({ itemId: z.string().max(40) });

export const POST = handler(async (request: Request) => {
  const session = await requireStudent();
  const input = await parseBody(request, body);
  const { rewards } = await getServices();
  return json(await rewards.buy(session.studentId, input.itemId));
});
