import { z } from "zod";
import { setSession } from "@/lib/auth/session";
import { HttpError, handler, json, parseBody, requireParent } from "@/lib/api";
import { getServices } from "@/lib/services";

/** Lets a signed-in parent hand the device to a student without typing the PIN. */
export const POST = handler(async (request: Request) => {
  const session = await requireParent();
  const { studentId } = await parseBody(request, z.object({ studentId: z.string().uuid() }));
  const { repos } = await getServices();
  const student = await repos.users.findStudent(studentId);
  if (!student || student.parentId !== session.parentId) throw new HttpError(404, "Student not found");
  await setSession({ parentId: session.parentId, studentId, role: "student" });
  return json({ ok: true });
});
