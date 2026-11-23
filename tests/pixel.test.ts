import { describe, expect, it } from "vitest";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { STICKERS } from "@/lib/gamification/collection";
import { validateSprite, type Sprite } from "@/lib/pixel/canvas";
import { SHOP_AVATAR_ART } from "@/lib/pixel/sprites/avatars";
import { BACKDROP_H, BACKDROP_IDS, BACKDROP_W, backdropFor } from "@/lib/pixel/sprites/backdrops";
import { BOSS_BY_UNIT, BOSS_SIZE, BOSSES } from "@/lib/pixel/sprites/bosses";
import { novaAttack, novaHurt, novaJump, novaRun, novaSit, novaSprite, novaTrip, novaWalk } from "@/lib/pixel/sprites/nova";
import { STICKER_ART_IDS, stickerArt } from "@/lib/pixel/sprites/stickers";
import * as ui from "@/lib/pixel/sprites/ui";

const catalog = buildCatalog(units);

describe("pixel art", () => {
  it("every sprite has even rows and only palette colours", () => {
    const all: [string, Sprite][] = [
      ["nova", novaSprite],
      ["nova-attack", novaAttack],
      ["nova-hurt", novaHurt],
      ["nova-walk", novaWalk],
      ["nova-run", novaRun],
      ["nova-sit", novaSit],
      ["nova-trip", novaTrip],
      ["nova-jump", novaJump],
      ["heart", ui.heartFull],
      ["heart-empty", ui.heartEmpty],
      ["star", ui.pixelStar],
      ["sword", ui.sword],
      ["shield", ui.shield],
      ["chest", ui.chests.wood.closed],
      ["chest-open", ui.chests.wood.open],
      ["boss-chest", ui.chests.boss.closed],
      ...BOSSES.flatMap((b): [string, Sprite][] => [
        [b.name, b.sprite],
        [`${b.name} attack`, b.attack],
        [`${b.name} hurt`, b.hurt],
      ]),
      ...BACKDROP_IDS.map((id): [string, Sprite] => [`backdrop ${id}`, backdropFor(id)]),
      ...STICKER_ART_IDS.map((id): [string, Sprite] => [`sticker ${id}`, stickerArt(id)]),
      ...Object.entries(SHOP_AVATAR_ART),
    ];
    expect(all.flatMap(([name, s]) => validateSprite(name, s))).toEqual([]);
  });

  it("every unit has a boss and a battle backdrop", () => {
    for (const u of catalog.units) {
      expect(BOSS_BY_UNIT.has(u.id), u.id).toBe(true);
      expect(BACKDROP_IDS, u.id).toContain(u.id);
    }
  });

  it("bosses have a 4-frame idle plus attack and hurt poses of the same size", () => {
    for (const b of BOSSES) {
      expect(b.sprite.frames).toHaveLength(4);
      for (const s of [b.sprite, b.attack, b.hurt]) expect([s.w, s.h]).toEqual([BOSS_SIZE, BOSS_SIZE]);
    }
    expect(novaSprite.frames).toHaveLength(4);
    for (const s of [novaWalk, novaRun]) expect(s.frames).toHaveLength(4);
    for (const s of [novaWalk, novaRun, novaSit, novaTrip, novaJump]) expect([s.w, s.h]).toEqual([novaWalk.w, novaWalk.h]);
  });

  it("backdrops are 128×72 and animated", () => {
    for (const id of BACKDROP_IDS) {
      const s = backdropFor(id);
      expect([s.w, s.h]).toEqual([BACKDROP_W, BACKDROP_H]);
      expect(s.frames.length).toBeGreaterThan(1);
    }
  });

  it("every sticker has its own art", () => {
    for (const st of STICKERS) expect(STICKER_ART_IDS, st.id).toContain(st.id);
  });
});
