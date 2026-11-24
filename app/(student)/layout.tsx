import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE_PAGE } from "@/lib/site";

// Student pages need a sign-in and show a child's own progress: never list them in search results.
export const metadata: Metadata = { robots: PRIVATE_PAGE };

export default function StudentLayout({ children }: { children: ReactNode }) {
  return children;
}
