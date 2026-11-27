"use client";

import { useEffect, useRef, useState } from "react";
import { GAME_PICKS, type GamePick } from "@/lib/game/pick";
import { cx } from "@/lib/ui";

/**
 * The header button for choosing how questions are played: both mini-games, only the runner,
 * only Star Catch, or cards. Opens a small menu; the choice applies from the current question on.
 */
export function GamePicker({ value, onChange }: { value: GamePick; onChange: (pick: GamePick) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const current = GAME_PICKS.find((p) => p.id === value) ?? GAME_PICKS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Escape closes the menu here; the runner shouldn't also pause on it
        e.stopImmediatePropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div ref={root} className="relative" data-no-steer>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full bg-white/5 px-3 py-1.5 font-pixel text-sm text-[#ead39b] hover:bg-white/10"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Game: ${current.label}. Choose a game`}
        title="Choose how to play: both mini-games, only the runner, only Star Catch, or cards"
      >
        {current.icon} <span className="hidden sm:inline">{current.label}</span> ▾
      </button>
      {open && (
        <div role="menu" aria-label="Choose a game" className="pixel-panel absolute right-0 top-full z-40 mt-2 w-60 p-1.5 font-pixel text-[#ece4d6]">
          {GAME_PICKS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={p.id === value}
              onClick={() => {
                onChange(p.id);
                setOpen(false);
              }}
              className={cx("flex w-full items-start gap-2 px-2 py-1.5 text-left hover:bg-white/10", p.id === value && "bg-[#ead39b] text-[#241c2b] hover:bg-[#ead39b]")}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {p.icon}
              </span>
              <span>
                <span className="block text-base leading-tight">{p.label}</span>
                <span className={cx("block font-sans text-xs leading-snug", p.id === value ? "text-[#4f3a2e]" : "text-[#a99cc4]")}>{p.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
