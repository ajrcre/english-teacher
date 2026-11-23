"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Art";
import { AVATARS } from "@/lib/avatars";
import { cx } from "@/lib/ui";

async function send(url: string, method: string, body?: object) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong");
  return data;
}

export function AddStudentForm({ units }: { units: { id: string; title: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [avatar, setAvatar] = useState<string>(AVATARS[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button className="btn btn-primary" onClick={() => setOpen(true)}>
        + Add a student
      </button>
    );
  }
  return (
    <form
      className="paper-card space-y-4 p-5"
      action={async (form) => {
        setBusy(true);
        setError(null);
        try {
          await send("/api/parent/students", "POST", { name: form.get("name"), pin: form.get("pin"), avatar, focusUnit: form.get("focusUnit") || null });
          setOpen(false);
          router.refresh();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Something went wrong");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3 className="font-display text-xl font-semibold">New student</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-text-soft">First name</span>
          <input name="name" required maxLength={40} className="field mt-1" />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-text-soft">4-digit PIN</span>
          <input name="pin" required pattern="\d{4}" inputMode="numeric" maxLength={4} className="field mt-1 tracking-[0.4em]" />
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-semibold text-text-soft">What is the class studying now?</span>
        <select name="focusUnit" className="field mt-1">
          <option value="">Mix of everything</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.title}
            </option>
          ))}
        </select>
      </label>
      <div>
        <span className="text-sm font-semibold text-text-soft">Avatar</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button type="button" key={a} onClick={() => setAvatar(a)} aria-pressed={avatar === a} aria-label={a} className={cx("rounded-full p-0.5", avatar === a ? "ring-4 ring-amber-400" : "opacity-60 hover:opacity-100")}>
              <Avatar avatar={a} name={a} size={48} />
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
      <div className="flex gap-3">
        <button className="btn btn-ink" disabled={busy}>
          {busy ? "Saving…" : "Add student"}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function StudentActions({ id, name, focusUnit, units }: { id: string; name: string; focusUnit: string | null; units: { id: string; title: string }[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="btn btn-primary min-h-10 px-4 text-sm"
        onClick={async () => {
          await send("/api/parent/play-as", "POST", { studentId: id });
          router.push("/home");
        }}
      >
        Start practice as {name}
      </button>
      <select
        aria-label="Focus unit"
        defaultValue={focusUnit ?? ""}
        className="field field-dark min-h-10 w-auto py-1.5 text-sm"
        onChange={async (e) => {
          await send(`/api/parent/students/${id}`, "PATCH", { focusUnit: e.target.value || null });
          setMsg("Focus saved");
          router.refresh();
        }}
      >
        <option value="">Focus: mix of everything</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            Focus: {u.title}
          </option>
        ))}
      </select>
      <button
        className="btn btn-ghost min-h-10 px-4 text-sm"
        onClick={async () => {
          const pin = window.prompt(`New 4-digit PIN for ${name}`);
          if (!pin) return;
          try {
            await send(`/api/parent/students/${id}`, "PATCH", { pin });
            setMsg("PIN changed");
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Could not change PIN");
          }
        }}
      >
        Change PIN
      </button>
      <button
        className="btn btn-ghost min-h-10 px-4 text-sm text-rose-300"
        onClick={async () => {
          if (!window.confirm(`Delete ${name} and all their progress? This cannot be undone.`)) return;
          await send(`/api/parent/students/${id}`, "DELETE");
          router.refresh();
        }}
      >
        Delete
      </button>
      {msg && <span className="text-sm text-teal-300">{msg}</span>}
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="text-sm font-semibold text-ink-300 hover:text-paper-100"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.replace("/");
      }}
    >
      Sign out
    </button>
  );
}
