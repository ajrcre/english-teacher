import type { Metadata } from "next";
import { publicPage } from "@/lib/site";
import { JoinFlow } from "./JoinFlow";

export const metadata: Metadata = publicPage(
  "/join",
  "Student sign in",
  "Students: sign in with your family code and PIN to practise English on Starlight.",
);

export default function JoinPage() {
  return (
    <main className="night-sky grid min-h-dvh place-items-center px-4 py-10">
      <JoinFlow />
    </main>
  );
}
