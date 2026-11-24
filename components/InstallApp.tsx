"use client";

import { Share, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

/**
 * "Add to home screen" support for the installable app (see app/manifest.ts).
 *
 * Android browsers fire `beforeinstallprompt` once per page load, often before the button that
 * wants it has mounted, so the event is captured as soon as this module loads (InstallPromptCatcher
 * is mounted in the root layout). iOS has no such event: there we show the Share → "Add to Home
 * Screen" steps instead. Nothing is shown when the app is already running from the home screen.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = { kind: "installed" } | { kind: "prompt"; event: InstallPromptEvent } | { kind: "ios" } | { kind: "none" };

let deferred: InstallPromptEvent | null = null;
let installed = false;
let snapshot: InstallState = { kind: "none" };
const listeners = new Set<() => void>();

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch support gives it away.
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function compute(): InstallState {
  if (installed || isStandalone()) return { kind: "installed" };
  if (deferred) return { kind: "prompt", event: deferred };
  if (isIOS()) return { kind: "ios" };
  return { kind: "none" };
}

function update() {
  const next = compute();
  const same = next.kind === snapshot.kind && (next.kind !== "prompt" || (snapshot.kind === "prompt" && snapshot.event === next.event));
  if (same) return;
  snapshot = next;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we offer our own button instead of the browser's mini-infobar
    deferred = e as InstallPromptEvent;
    update();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    update();
  });
  snapshot = compute();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  update();
  return () => listeners.delete(listener);
}

const serverSnapshot: InstallState = { kind: "none" };

function useInstallState() {
  return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
}

/** Mount once in the root layout so the install event is caught on whichever page fires it. */
export function InstallPromptCatcher() {
  return null;
}

export function InstallAppButton({ className }: { className?: string }) {
  const state = useInstallState();
  const [showSteps, setShowSteps] = useState(false);

  if (state.kind === "installed" || state.kind === "none") return null;

  if (state.kind === "prompt") {
    return (
      <button
        type="button"
        className={`btn btn-ghost ${className ?? ""}`}
        onClick={async () => {
          await state.event.prompt();
          const { outcome } = await state.event.userChoice;
          deferred = null; // a prompt event can only be used once
          if (outcome === "accepted") installed = true;
          update();
        }}
      >
        <Smartphone aria-hidden className="h-5 w-5" />
        Add to home screen
      </button>
    );
  }

  return (
    <div className={className}>
      <button type="button" className="btn btn-ghost" aria-expanded={showSteps} onClick={() => setShowSteps((s) => !s)}>
        <Smartphone aria-hidden className="h-5 w-5" />
        Add to home screen
      </button>
      {showSteps && (
        <ol className="mt-3 max-w-sm list-decimal space-y-1 rounded-2xl border border-white/10 bg-white/5 p-4 pl-8 text-sm text-ink-200">
          <li>
            Tap the <strong>Share</strong> button <Share aria-label="Share icon" className="inline h-4 w-4 align-[-2px]" /> in Safari.
          </li>
          <li>
            Choose <strong>Add to Home Screen</strong>.
          </li>
          <li>
            Tap <strong>Add</strong>. Starlight now opens like an app.
          </li>
        </ol>
      )}
    </div>
  );
}
