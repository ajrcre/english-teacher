"use client";

import { useEffect, useRef, useState } from "react";

/** The family code with a button that copies it to the clipboard. */
export function CopyCode({ code }: { code: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      // Older browsers / insecure contexts: fall back to a hidden textarea.
      try {
        const area = document.createElement("textarea");
        area.value = code;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        ok = document.execCommand("copy");
        document.body.removeChild(area);
      } catch {
        ok = false;
      }
    }
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="font-mono text-2xl font-bold tracking-[0.2em] text-amber-300 select-all">{code}</div>
      <button
        type="button"
        onClick={() => void copy()}
        className="btn btn-ghost min-h-10 px-3 text-sm"
        aria-label={state === "copied" ? "Family code copied" : "Copy family code"}
      >
        {state === "copied" ? (
          <>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-teal-300" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
            Copied
          </>
        ) : state === "failed" ? (
          "Select & copy"
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
              <rect x="9" y="9" width="11" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Copy
          </>
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "copied" ? "Family code copied to the clipboard" : ""}
      </span>
    </div>
  );
}
