import { describe, expect, it } from "vitest";
import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
import { STICKERS } from "@/lib/gamification/collection";
import { validateSprite, type Sprite } from "@/lib/pixel/canvas";
import { SHOP_AVATAR_ART } from "@/lib/pixel/sprites/avatars";
import { BACKDROP_H, BACKDROP_IDS, BACKDROP_W, backdropFor } from "@/lib/pixel/sprites/backdrops";
import { BOSS_BY_UNIT, BOSS_SIZE, BOSSES } from "@/lib/pixel/sprites/bosses";
import { HAT_IDS, hatOf } from "@/lib/pixel/sprites/hats";
import { novaAttack, novaHurt, novaJump, novaRun, novaSit, novaSprite, novaSprites, novaTrip, novaWalk } from "@/lib/pixel/sprites/nova";
import { HAT_ITEM_IDS } from "@/lib/gamification/collection";
import { STICKER_ART_IDS, stickerArt } from "@/lib/pixel/sprites/stickers";
import * as runner from "@/lib/pixel/sprites/runner";
import * as starCatch from "@/lib/pixel/sprites/starCatch";
import * as ui from "@/lib/pixel/sprites/ui";
import { BUBBLE_BREAK, BUBBLE_FLY, BUBBLE_POP, FOX_H, FOX_W, GREY_FOX } from "@/lib/pixel/sprites/greyFox";
import { hatSprite } from "@/lib/pixel/sprites/hats";

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
      ["gate", runner.gateIdle],
      ["gate-glow", runner.gateGlow],
      ["gate-burst", runner.gateBurst],
      ["gate-cracked", runner.gateCracked],
      ["dust", runner.dust],
      ["sparkle", runner.sparkle],
      ["star-falling", starCatch.fallingStar],
      ["star-glowing", starCatch.glowingStar],
      ["star-cracked", starCatch.crackedStar],
      ["basket", starCatch.basket],
      ["chest-open", ui.chests.wood.open],
      ["boss-chest", ui.chests.boss.closed],
      ...BOSSES.flatMap((b): [string, Sprite][] => [
        [b.name, b.sprite],
        [`${b.name} attack`, b.attack],
        [`${b.name} hurt`, b.hurt],
      ]),
      ["grey fox", GREY_FOX.sprite],
      ["grey fox talk", GREY_FOX.talk],
      ["grey fox attack", GREY_FOX.attack],
      ["grey fox throw", GREY_FOX.throw],
      ["grey fox hurt", GREY_FOX.hurt],
      ["grey star", starCatch.greyStar],
      ["bubble fly", BUBBLE_FLY],
      ["bubble break", BUBBLE_BREAK],
      ["bubble pop", BUBBLE_POP],
      ["E hat", hatSprite("e")],
      ...BACKDROP_IDS.map((id): [string, Sprite] => [`backdrop ${id}`, backdropFor(id)]),
      ...STICKER_ART_IDS.map((id): [string, Sprite] => [`sticker ${id}`, stickerArt(id)]),
      ...Object.entries(SHOP_AVATAR_ART),
    ];
    expect(all.flatMap(([name, s]) => validateSprite(name, s))).toEqual([]);
  });

  it("every hat fits Nova in every pose without changing her size", () => {
    const plain = novaSprites(null);
    for (const hat of HAT_IDS) {
      const dressed = novaSprites(hat);
      for (const [pose, s] of Object.entries(dressed)) {
        expect(validateSprite(`${hat}:${pose}`, s)).toEqual([]);
        const base = plain[pose as keyof typeof plain];
        expect([s.w, s.h, s.frames.length], `${hat}:${pose}`).toEqual([base.w, base.h, base.frames.length]);
        // The hat flies off while she tumbles (roll) and sits dazed; every other pose wears it.
        if (pose !== "roll" && pose !== "dazed") expect(s.frames[0].join(""), `${hat}:${pose} shows the hat`).not.toEqual(base.frames[0].join(""));
      }
    }
    // Every hat in the shop has art.
    for (const id of HAT_ITEM_IDS) expect(hatOf(id), id).not.toBeNull();
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

  it("the Grey Fox stands on two legs, with a 4-frame idle, a talk loop and a 4-frame throw", () => {
    expect(GREY_FOX.sprite.frames).toHaveLength(4);
    expect(GREY_FOX.throw.frames).toHaveLength(4);
    expect(GREY_FOX.talk.frames).toHaveLength(2);
    for (const s of [GREY_FOX.sprite, GREY_FOX.talk, GREY_FOX.attack, GREY_FOX.throw, GREY_FOX.hurt]) expect([s.w, s.h]).toEqual([FOX_W, FOX_H]);
    expect(FOX_H).toBeGreaterThan(FOX_W);
    expect(BUBBLE_FLY.frames).toHaveLength(4);
    expect(BUBBLE_BREAK.frames).toHaveLength(6);
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
