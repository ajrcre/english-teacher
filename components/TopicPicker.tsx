"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cx } from "@/lib/ui";

export interface TopicGroup {
  id: string;
  title: string;
  lessons: { id: string; title: string; total: number; mastered: number }[];
}

const STORE = "starlight.topics.";

/**
 * Tick a few topics (lessons) and practise only those, together in one round.
 * The choice is remembered on this device, so the same set is ready next time.
 */
export function TopicPicker({ groups, storageKey, defaultAll = false, tone = "dark", scroll = false }: { groups: TopicGroup[]; storageKey: string; defaultAll?: boolean; tone?: "dark" | "amber"; /** Long lists scroll inside a box. */ scroll?: boolean }) {
  const router = useRouter();
  const all = groups.flatMap((g) => g.lessons.map((l) => l.id));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(defaultAll ? all : []));

  // Bring back this device's last choice (only topics that still exist).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE + storageKey) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring a saved choice after hydration
      if (Array.isArray(saved)) setPicked(new Set(saved.filter((id: unknown) => typeof id === "string" && all.includes(id))));
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const save = (next: Set<string>) => {
    setPicked(next);
    try {
      localStorage.setItem(STORE + storageKey, JSON.stringify([...next]));
    } catch {
      /* private mode */
    }
  };
  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    save(next);
  };
  const chosen = all.filter((id) => picked.has(id));
  const go = () => {
    if (chosen.length) router.push(`/practice?mode=lesson&lessons=${chosen.map(encodeURIComponent).join(",")}`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-sm">
        <button type="button" className="font-semibold text-amber-300 hover:text-amber-200" onClick={() => save(new Set(all))}>
          Select all
        </button>
        <button type="button" className="font-semibold text-ink-300 hover:text-ink-100" onClick={() => save(new Set())}>
          Clear
        </button>
      </div>
      <div className={cx("mt-2 flex flex-col gap-3", scroll && "max-h-80 overflow-y-auto overscroll-contain pr-1")}>
        {groups.map((g) => (
          <fieldset key={g.id}>
            {groups.length > 1 && <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">{g.title}</legend>}
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {g.lessons.map((l) => {
                const on = picked.has(l.id);
                const done = l.total > 0 && l.mastered >= l.total;
                return (
                  <li key={l.id}>
                    <label className={cx("flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition", on ? (tone === "amber" ? "border-amber-400/70 bg-amber-400/10" : "border-teal-400/70 bg-teal-400/10") : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]")}>
                      <input type="checkbox" className="h-4 w-4 shrink-0 accent-amber-400" checked={on} onChange={() => toggle(l.id)} />
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                      <span className={cx("shrink-0 text-xs", done ? "text-teal-300" : "text-ink-400")}>
                        {done ? "★" : `${l.mastered}/${l.total}`}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
      <button type="button" className="btn btn-primary mt-3 w-full" disabled={!chosen.length} onClick={go}>
        {chosen.length === 0 ? "Pick at least one topic" : chosen.length === 1 ? "Practise this topic" : `Practise these ${chosen.length} topics`}
      </button>
    </div>
  );
}
