"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Art";
import { InstallAppButton } from "@/components/InstallApp";
import { AVATARS } from "@/lib/avatars";
import { cx } from "@/lib/ui";

export function ProfileSettings({ name, avatar, soundOn }: { name: string; avatar: string; soundOn: boolean }) {
  const router = useRouter();
  const [sound, setSound] = useState(soundOn);
  const [current, setCurrent] = useState(avatar);

  async function patch(body: object) {
    await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold">Avatar</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {AVATARS.map((a) => (
            <button
              key={a}
              aria-label={a}
              aria-pressed={current === a}
              className={cx("rounded-full p-0.5 transition", current === a ? "ring-4 ring-amber-400" : "opacity-70 hover:opacity-100")}
              onClick={() => {
                setCurrent(a);
                void patch({ avatar: a });
              }}
            >
              <Avatar avatar={a} name={name} size={56} />
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <span>
          <span className="block font-semibold">Sound effects</span>
          <span className="text-sm text-ink-300">Chimes for right answers, combos and badges.</span>
        </span>
        <input
          type="checkbox"
          className="h-6 w-6 accent-amber-400"
          checked={sound}
          onChange={(e) => {
            setSound(e.target.checked);
            void patch({ soundOn: e.target.checked });
          }}
        />
      </label>
      <InstallAppButton />
      <button
        className="btn btn-ghost"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/join");
        }}
      >
        Sign out
      </button>
    </div>
  );
}
