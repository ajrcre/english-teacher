import type { Metadata } from "next";
import { publicPage } from "@/lib/site";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = publicPage(
  "/parent/signup",
  "Set up Starlight for your family",
  "Create a family account, add your Year 7 students with a 4-digit PIN, and follow their English practice from your dashboard.",
);

export default function Page() {
  return <AuthForm mode="signup" />;
}
