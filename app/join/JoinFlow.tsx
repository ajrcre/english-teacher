"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Logo } from "@/components/Art";

interface StudentCard {
  id: string;
  name: string;
  avatar: string;
}

const CODE_KEY = "starlight.familyCode";

function readStoredCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function JoinFlow() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [students, setStudents] = useState<StudentCard[] | null>(null);
  const [chosen, setChosen] = useState<StudentCard | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookup(c: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/family/${encodeURIComponent(c)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setStudents(data.students);
      try {
        localStorage.setItem(CODE_KEY, data.familyCode);
      } catch {
        /* private mode */
      }
      setCode(data.familyCode);
      if (data.students.length === 1) setChosen(data.students[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Remembered family code (localStorage is only readable after mount).
    const stored = readStoredCode();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) void lookup(stored);
  }, []);

  async function submitPin(full: string) {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyCode: code, studentId: chosen.id, pin: full }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "That PIN isn't right.");
      router.replace("/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That PIN isn't right.");
      setPin("");
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) void submitPin(next);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex justify-center">
        <Link href="/">
          <Logo />
        </Link>
      </div>

      {!students && (
        <form
          className="paper-card relative p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) void lookup(code.trim());
          }}
        >
          <h1 className="font-display text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-text-soft">Type your family code. A parent can find it on their dashboard.</p>
          <label className="mt-5 block text-sm font-semibold text-text-soft" htmlFor="code">
            Family code
          </label>
          <input
            id="code"
            className="field mt-1 text-center font-mono text-2xl tracking-[0.3em] uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC-123"
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={7}
          />
          {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
          <button className="btn btn-ink mt-5 w-full" disabled={busy || code.trim().length < 6}>
            {busy ? "Looking…" : "Continue"}
          </button>
        </form>
      )}

      {students && !chosen && (
        <div className="paper-card p-6">
          <h1 className="font-display text-2xl font-semibold">Who's practising?</h1>
          {students.length === 0 && <p className="mt-3 text-text-soft">No students yet. Ask a parent to add you on their dashboard.</p>}
          <ul className="mt-5 grid grid-cols-2 gap-3">
            {students.map((s) => (
              <li key={s.id}>
                <button onClick={() => setChosen(s)} className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-paper-300 bg-paper-50 p-4 hover:border-ink-400">
                  <Avatar avatar={s.avatar} name={s.name} size={72} />
                  <span className="font-semibold">{s.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <button
            className="mt-5 text-sm font-semibold text-text-soft underline"
            onClick={() => {
              setStudents(null);
              setCode("");
            }}
          >
            Use a different family code
          </button>
        </div>
      )}

      {chosen && (
        <div className="paper-card p-6 text-center">
          <Avatar avatar={chosen.avatar} name={chosen.name} size={84} className="mx-auto" />
          <h1 className="mt-3 font-display text-2xl font-semibold">Hi, {chosen.name}!</h1>
          <p className="text-text-soft">Enter your 4-digit PIN</p>
          <div className="mt-5 flex justify-center gap-3" aria-live="polite" aria-label={`${pin.length} of 4 digits entered`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-4 w-4 rounded-full border-2 border-ink-800 ${i < pin.length ? "bg-ink-800" : ""}`} />
            ))}
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} onClick={() => press(d)} className="btn btn-ink h-16 text-2xl" disabled={busy}>
                {d}
              </button>
            ))}
            <button onClick={() => setPin(pin.slice(0, -1))} className="btn btn-ghost h-16 text-text-soft" style={{ color: "var(--color-text-soft)" }} aria-label="Delete">
              ⌫
            </button>
            <button onClick={() => press("0")} className="btn btn-ink h-16 text-2xl" disabled={busy}>
              0
            </button>
            <span />
          </div>
          {students && students.length > 1 && (
            <button className="mt-5 text-sm font-semibold text-text-soft underline" onClick={() => { setChosen(null); setPin(""); setError(null); }}>
              Not {chosen.name}?
            </button>
          )}
        </div>
      )}
    </div>
  );
}
