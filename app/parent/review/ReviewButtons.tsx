"use client";

import { useState } from "react";

export function ReviewButtons({ itemId, initial, initialNote }: { itemId: string; initial: "approved" | "flagged" | null; initialNote: string | null }) {
  const [status, setStatus] = useState(initial);
  const [note, setNote] = useState(initialNote ?? "");
  const [showNote, setShowNote] = useState(initial === "flagged");

  async function save(s: "approved" | "flagged", n: string | null) {
    setStatus(s);
    await fetch("/api/parent/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, status: s, note: n }) });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button className={`btn min-h-9 px-4 text-sm ${status === "approved" ? "bg-teal-600 text-white" : "btn-ghost"}`} onClick={() => void save("approved", null)}>
          {status === "approved" ? "✓ Looks right" : "Looks right"}
        </button>
        <button
          className={`btn min-h-9 px-4 text-sm ${status === "flagged" ? "bg-rose-600 text-white" : "btn-ghost"}`}
          onClick={() => {
            setShowNote(true);
            void save("flagged", note || null);
          }}
        >
          {status === "flagged" ? "⚑ Flagged" : "Flag a problem"}
        </button>
      </div>
      {showNote && (
        <textarea
          className="field field-dark mt-2 text-sm"
          rows={2}
          placeholder="What should the answer be?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => status === "flagged" && void save("flagged", note || null)}
        />
      )}
    </div>
  );
}
