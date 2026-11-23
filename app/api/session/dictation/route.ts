import { HttpError, handler, json, requireStudent } from "@/lib/api";
import { getCatalog } from "@/lib/content/catalog";

/** Fallback when a dictation audio file is missing: the text for the browser's speech synthesis. */
export const GET = handler(async (request: Request) => {
  await requireStudent();
  const url = new URL(request.url);
  const ref = getCatalog().itemById.get(url.searchParams.get("itemId") ?? "");
  if (!ref || ref.item.type !== "dictation") throw new HttpError(404, "Not found");
  const part = url.searchParams.get("part") === "sentence" ? "sentence" : "word";
  return json({ text: part === "word" ? ref.item.word : ref.item.sentence });
});
