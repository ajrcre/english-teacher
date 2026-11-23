import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServices } from "@/lib/services";

/** Loads the signed-in student for a page, or sends them to the sign-in screen. */
export async function requireStudentPage() {
  const session = await getSession();
  if (!session?.studentId) redirect("/join");
  const services = await getServices();
  const student = await services.repos.users.findStudent(session.studentId);
  if (!student || student.parentId !== session.parentId) redirect("/join");
  return { session, student, services };
}

export async function requireParentPage() {
  const session = await getSession();
  if (!session || session.role !== "parent") redirect("/parent/login");
  const services = await getServices();
  const parent = await services.repos.users.findParentById(session.parentId);
  if (!parent) redirect("/parent/login");
  return { session, parent, services };
}
