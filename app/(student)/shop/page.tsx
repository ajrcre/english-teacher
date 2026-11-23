import type { Metadata } from "next";
import { PixelScene } from "@/components/pixel/PixelScene";
import { PixelSprite } from "@/components/pixel/PixelSprite";
import { ShopGrid } from "@/components/rewards/ShopGrid";
import { StudentHeader } from "@/components/StudentHeader";
import { backdropFor } from "@/lib/pixel/sprites/backdrops";
import { hatOf } from "@/lib/pixel/sprites/hats";
import { novaSprites } from "@/lib/pixel/sprites/nova";
import { chests } from "@/lib/pixel/sprites/ui";
import { requireStudentPage } from "@/lib/student";

export const metadata: Metadata = { title: "Star Shop" };

export default async function ShopPage() {
  const { student, services } = await requireStudentPage();
  const [{ stats }, shop] = await Promise.all([services.practice.overview(student.id), services.rewards.shop(student.id)]);
  return (
    <main className="night-sky min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-5 sm:px-6">
        <StudentHeader name={student.name} avatar={student.avatar} frame={student.frame} stats={stats} back={{ href: "/home", label: "Sky" }} />
        <section className="pixel-panel relative mt-6 overflow-hidden" style={{ aspectRatio: "128 / 46" }}>
          <div className="absolute inset-x-0" style={{ top: "-52%" }}>
            <PixelScene sprite={backdropFor("word-treasury")} />
          </div>
          <div className="absolute bottom-[6%] left-[8%] w-[22%]">
            <PixelSprite sprite={novaSprites(hatOf(student.hat)).idle} fps={3} className="h-auto w-full" />
          </div>
          <div className="absolute bottom-[8%] right-[10%] w-[14%]">
            <PixelSprite sprite={chests.boss.open} className="h-auto w-full" />
          </div>
          <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#241c2bdd] to-transparent p-4 pb-8 font-pixel">
            <h1 className="text-3xl text-[#ead39b] sm:text-4xl">Star Shop</h1>
            <p className="text-sm text-[#ece4d6]">Spend the stars you earn on cool stuff.</p>
          </div>
        </section>
        <div className="mt-4">
          <ShopGrid initial={shop} avatar={student.avatar} />
        </div>
      </div>
    </main>
  );
}
