import Link from "next/link";
import { redirect } from "next/navigation";
import { Art, Logo } from "@/components/Art";
import { getSession } from "@/lib/auth/session";

export default async function Landing() {
  const session = await getSession();
  if (session?.studentId) redirect("/home");
  if (session?.role === "parent") redirect("/parent");

  return (
    <main className="night-sky relative min-h-dvh overflow-hidden">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 pb-10 pt-6 sm:px-8">
        <header className="flex items-center justify-between">
          <Logo />
          <Link href="/parent/login" className="text-sm font-semibold text-ink-300 hover:text-paper-100">
            Parents
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 md:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="eyebrow text-amber-400">Year 7 · English Speakers' Programme</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-paper-50 sm:text-6xl">
              Light up the sky,
              <br />
              <span className="italic text-amber-300">one word at a time.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-200">
              Practise your novels, stories, poems, grammar and spelling in twenty minutes a day. Every mistake comes back until it's
              yours for good.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/join" className="btn btn-primary text-lg">
                I'm a student
              </Link>
              <Link href="/parent/signup" className="btn btn-ghost">
                Set up for my family
              </Link>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <Art src="/art/hero.webp" alt="A paper-cut fox holding a lantern under a starry sky" className="h-full w-full rounded-[2rem] object-cover shadow-[var(--shadow-lift)]" />
          </div>
        </section>
      </div>
    </main>
  );
}
