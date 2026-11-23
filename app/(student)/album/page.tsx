import type { Metadata } from "next";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { StudentHeader } from "@/components/StudentHeader";
import { getCatalog } from "@/lib/content/catalog";
import { stickerArt } from "@/lib/pixel/sprites/stickers";
import { requireStudentPage } from "@/lib/student";
import { cx } from "@/lib/ui";

export const metadata: Metadata = { title: "Sticker Album" };

const RARITY = {
  common: { label: "Common", edge: "#241c2b", text: "text-[#a99cc4]" },
  rare: { label: "Rare", edge: "#5f9890", text: "text-[#9cc2b9]" },
  legendary: { label: "Legendary", edge: "#cf9c55", text: "text-[#ead39b]" },
};

export default async function AlbumPage() {
  const { student, services } = await requireStudentPage();
  const [{ stats }, album] = await Promise.all([services.practice.overview(student.id), services.rewards.album(student.id)]);
  const catalog = getCatalog();
  const unitIds = [...new Set(album.stickers.map((s) => s.unitId))];
  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6">
        <StudentHeader name={student.name} avatar={student.avatar} frame={student.frame} stats={stats} back={{ href: "/home", label: "Sky" }} />
        <header className="mt-8 font-pixel">
          <h1 className="text-4xl text-[#ead39b]">Sticker Album</h1>
          <p className="text-[#ece4d6]">
            {album.collected} of {album.total} collected. Finish rounds to win treasure chests; beat bosses for legendary stickers.
          </p>
          <div className="mt-3 flex gap-[3px] bg-[#241c2b] p-[3px]" role="progressbar" aria-valuemin={0} aria-valuemax={album.total} aria-valuenow={album.collected} aria-label="Stickers collected">
            {album.stickers.map((s) => (
              <span key={s.id} className={cx("h-3 flex-1", s.count > 0 ? (s.rarity === "legendary" ? "bg-[#ead39b]" : "bg-[#a2b47f]") : "bg-[#4b416b]")} />
            ))}
          </div>
        </header>
        {unitIds.map((unitId) => (
          <section key={unitId} className="mt-8 font-pixel">
            <h2 className="text-xl text-[#ece4d6]">{catalog.unitById.get(unitId)?.title ?? unitId}</h2>
            <ul className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
              {album.stickers
                .filter((s) => s.unitId === unitId)
                .map((s) => {
                  const got = s.count > 0;
                  const art = stickerArt(s.id);
                  return (
                    <li key={s.id} className="pixel-panel flex flex-col items-center p-2 text-center" style={{ ["--px-edge" as string]: got ? RARITY[s.rarity].edge : "#241c2b" }}>
                      <div className="grid aspect-square w-full place-items-center bg-[#241c2b]">
                        <PixelSprite sprite={art} scale={art.w > 16 ? 1.6 : 4} silhouette={!got} className={cx(!got && "text-[#3a3354]")} />
                      </div>
                      <p className={cx("mt-1 text-xs leading-tight sm:text-sm", got ? "text-[#ece4d6]" : "text-[#5a5560]")}>{got ? s.title : "???"}</p>
                      <p className={cx("text-[10px] uppercase tracking-wider", got ? RARITY[s.rarity].text : "text-[#5a5560]")}>
                        {RARITY[s.rarity].label}
                        {s.count > 1 ? ` ×${s.count}` : ""}
                      </p>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
