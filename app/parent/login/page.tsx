import type { Metadata } from "next";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = { title: "Parent sign in" };

export default function Page() {
  return <AuthForm mode="login" />;
}
