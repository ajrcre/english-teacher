"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/Art";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { playSfx } from "@/components/sound";
import { hatOf } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import { pixelStar, shield } from "@/lib/pixel/sprites/ui";
import type { ShopView } from "@/lib/services/rewards";
import { cx } from "@/lib/ui";

const SECTIONS: { kind: string; title: string; blurb: string }[] = [
  { kind: "hat", title: "Nova's hats", blurb: "Nova wears her hat on every journey and in every boss battle." },
  { kind: "avatar", title: "Avatars", blurb: "New faces for your profile." },
  { kind: "frame", title: "Frames", blurb: "A ring around your avatar, for everyone to see." },
  { kind: "shield", title: "Streak care", blurb: "Missed a day? A shield keeps your streak alive." },
];

/** The star shop: buy with stars, then wear what you bought. */
export function ShopGrid({ initial, avatar }: { initial: ShopView; avatar: string }) {
  const router = useRouter();
  const [view, setView] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<{ text: string; good: boolean } | null>(null);
  const [wearing, setWearing] = useState(avatar);

  async function buy(id: string, title: string) {
    setBusy(id);
    setNote(null);
    const res = await fetch("/api/shop/buy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: id }) });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      playSfx("wrong", 0.3);
      setNote({ text: data.error ?? "Could not buy that", good: false });
      return;
    }
    playSfx("badge");
    setView(data as ShopView);
    if (id.startsWith("px-")) setWearing(id);
    setNote({ text: id === "shield" ? "Shield ready! Your streak is safer now." : `${title} is yours, and you're wearing it!`, good: true });
    router.refresh();
  }

  async function wear(id: string, kind: string) {
    setBusy(id);
    await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kind === "avatar" ? { avatar: id } : kind === "hat" ? { hat: id } : { frame: id }) });
    setBusy(null);
    if (kind === "avatar") setWearing(id);
    setView((v) => ({ ...v, items: v.items.map((i) => (i.kind === kind ? { ...i, equipped: i.id === id } : i)) }));
    playSfx("tap");
    router.refresh();
  }

  async function takeOff(kind: "frame" | "hat") {
    setBusy(kind);
    await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [kind]: null }) });
    setBusy(null);
    setView((v) => ({ ...v, items: v.items.map((i) => (i.kind === kind ? { ...i, equipped: false } : i)) }));
    playSfx("tap");
    router.refresh();
  }

  return (
    <div className="font-pixel">
      <div className="pixel-panel sticky top-2 z-10 flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-[#a99cc4]">Your stars</span>
        <span className="flex items-center gap-2 text-3xl text-[#ead39b]" aria-live="polite">
          <PixelSprite sprite={pixelStar} scale={3} />
          {view.balance}
        </span>
      </div>
      {note && (
        <p role="status" className={cx("pixel-panel mt-3 px-4 py-2 text-center", note.good ? "text-[#a2b47f]" : "text-[#cf9f9b]")}>
          {note.text}
        </p>
      )}
      {SECTIONS.map((sec) => (
        <section key={sec.kind} className="mt-8">
          <h2 className="text-2xl text-[#ece4d6]">{sec.title}</h2>
          <p className="text-sm text-[#a99cc4]">{sec.blurb}</p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {view.items
              .filter((i) => i.kind === sec.kind)
              .map((item) => {
                const afford = view.balance >= item.price;
                return (
                  <li key={item.id} className={cx("pixel-panel flex flex-col items-center p-3 text-center", item.equipped && "[--px-edge:#cf9c55]")}>
                    <div className="grid h-24 place-items-center">
                      {item.kind === "avatar" && <Avatar avatar={item.id} name={item.title} size={72} />}
                      {item.kind === "frame" && <Avatar avatar={wearing} name={item.title} size={60} frame={item.id} />}
                      {item.kind === "shield" && <PixelSprite sprite={shield} scale={5} />}
                      {item.kind === "hat" && <PixelSprite sprite={novaSprites(hatOf(item.id)).idle} scale={3} fps={3} title={`Nova wearing the ${item.title}`} />}
                    </div>
                    <p className="mt-1 text-lg leading-tight text-[#ece4d6]">{item.title}</p>
                    <p className="mt-1 min-h-[2.5em] text-xs leading-snug text-[#a99cc4]">{item.kind === "shield" ? `${view.shields}/${view.maxShields} carried. ${item.description}` : item.description}</p>
                    <div className="mt-auto w-full pt-2">
                      {item.owned && item.kind !== "shield" ? (
                        item.equipped ? (
                          <span className="block py-3 text-[#ead39b]">Wearing ✓</span>
                        ) : (
                          <button className="pixel-btn pixel-btn-ghost w-[calc(100%-8px)] text-base" disabled={busy !== null} onClick={() => void wear(item.id, item.kind)}>
                            Wear
                          </button>
                        )
                      ) : item.earnedBy ? (
                        <span className="block py-2 text-sm leading-snug text-[#cf9c55]">🔒 {item.earnedBy}</span>
                      ) : (
                        <button
                          className="pixel-btn w-[calc(100%-8px)] text-base"
                          disabled={busy !== null || !afford || item.soldOut}
                          onClick={() => void buy(item.id, item.title)}
                          aria-label={`Buy ${item.title} for ${item.price} stars`}
                        >
                          {item.soldOut ? (
                            "Full"
                          ) : (
                            <>
                              <PixelSprite sprite={pixelStar} scale={2} />
                              {item.price}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
          {(sec.kind === "hat" || sec.kind === "frame") && view.items.some((i) => i.kind === sec.kind && i.equipped) && (
            <p className="mt-3 text-center text-sm text-[#a99cc4]">
              {sec.kind === "hat" ? "Want Nova bare-headed?" : "Want no frame?"}{" "}
              <button className="underline" disabled={busy !== null} onClick={() => void takeOff(sec.kind as "frame" | "hat")}>
                Take it off
              </button>
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
