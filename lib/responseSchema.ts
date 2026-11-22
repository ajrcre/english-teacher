import { z } from "zod";

const short = z.string().max(4000);

/** Validates a student's response payload (see ItemResponse). */
export const itemResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("mcq"), choice: short }),
  z.object({ type: z.literal("typed"), text: short }),
  z.object({ type: z.literal("match"), pairs: z.array(z.tuple([short, short])).max(12) }),
  z.object({ type: z.literal("sort"), placement: z.record(short, short) }),
  z.object({ type: z.literal("sequence"), order: z.array(short).max(12) }),
  z.object({ type: z.literal("dictation"), text: short }),
  z.object({ type: z.literal("open"), text: short }),
  z.object({ type: z.literal("rewrite"), text: short }),
  z.object({ type: z.literal("proofread"), text: short }),
]);

export const sessionModeSchema = z.enum(["review", "explore", "lesson", "mistakes"]);
