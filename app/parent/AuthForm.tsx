"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Art";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(form: FormData) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.replace("/parent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="night-sky grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <form action={onSubmit} className="paper-card space-y-4 p-6">
          <div>
            <h1 className="font-display text-2xl font-semibold">{mode === "login" ? "Parent sign in" : "Create a family account"}</h1>
            <p className="mt-1 text-text-soft">
              {mode === "login" ? "Manage students and see their progress." : "You'll add your children and their PINs next."}
            </p>
          </div>
          {mode === "signup" && (
            <label className="block">
              <span className="text-sm font-semibold text-text-soft">Your name</span>
              <input name="name" required maxLength={60} className="field mt-1" autoComplete="name" />
            </label>
          )}
          <label className="block">
            <span className="text-sm font-semibold text-text-soft">Email</span>
            <input name="email" type="email" required className="field mt-1" autoComplete="email" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-text-soft">Password</span>
            <input name="password" type="password" required minLength={mode === "signup" ? 8 : 1} className="field mt-1" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            {mode === "signup" && <span className="mt-1 block text-xs text-text-soft">At least 8 characters.</span>}
          </label>
          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          <button className="btn btn-ink w-full" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <p className="text-center text-sm text-text-soft">
            {mode === "login" ? (
              <>
                New here? <Link className="font-semibold underline" href="/parent/signup">Create an account</Link>
              </>
            ) : (
              <>
                Already have an account? <Link className="font-semibold underline" href="/parent/login">Sign in</Link>
              </>
            )}
          </p>
        </form>
      </div>
    </main>
  );
}
