import type { Metadata } from "next";
import { publicPage } from "@/lib/site";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = publicPage(
  "/parent/login",
  "Parent sign in",
  "Parents: sign in to see your child's daily practice minutes, accuracy, mastery per unit and recent mistakes.",
);

export default function Page() {
  return <AuthForm mode="login" />;
}
