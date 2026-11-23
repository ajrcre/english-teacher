import type { Metadata } from "next";
import { JoinFlow } from "./JoinFlow";

export const metadata: Metadata = { title: "Sign in" };

export default function JoinPage() {
  return (
    <main className="night-sky grid min-h-dvh place-items-center px-4 py-10">
      <JoinFlow />
    </main>
  );
}
