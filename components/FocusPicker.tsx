"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Lets the student (or a parent) choose which unit new material comes from. */
export function FocusPicker({ units, value }: { units: { id: string; title: string }[]; value: string | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  async function change(v: string) {
    setCurrent(v);
    setSaving(true);
    await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ focusUnit: v || null }) });
    setSaving(false);
    router.refresh();
  }

  return (
    <label className="flex flex-wrap items-center gap-2 text-sm text-ink-300">
      <span>New material from</span>
      <select value={current} onChange={(e) => void change(e.target.value)} className="field field-dark min-h-0 w-auto py-1.5 text-sm" disabled={saving} aria-label="Focus unit">
        <option value="">All units</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.title}
          </option>
        ))}
      </select>
    </label>
  );
}
