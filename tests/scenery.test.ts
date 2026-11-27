import { describe, expect, it } from "vitest";
import { validateSprite, type Sprite } from "@/lib/pixel/canvas";
import { BACKDROP_IDS } from "@/lib/pixel/sprites/backdrops";
import { DETAIL_W, FORE_H, FORE_W, foreScenery, groundDetails, MID_H, MID_W, midScenery, SCENERY_IDS } from "@/lib/pixel/sprites/scenery";
import { easeScenery, SCENERY } from "@/lib/game/runner";

/** A tile repeats seamlessly when nothing is drawn on its first and last columns. */
const edgesClear = (s: Sprite) => s.frames[0].every((row) => row[0] === "." && row[row.length - 1] === ".");
const filled = (s: Sprite) => s.frames[0].join("").replace(/\./g, "").length;

describe("runner scenery", () => {
  it("has scenery for every unit world", () => {
    expect([...SCENERY_IDS].sort()).toEqual([...BACKDROP_IDS].sort());
  });

  it.each(SCENERY_IDS)("%s: valid, seamless tiles with something on them", (id) => {
    const layers: [Sprite, number, number][] = [
      [midScenery(id), MID_W, MID_H],
      [foreScenery(id), FORE_W, FORE_H],
      [groundDetails(id, 30), DETAIL_W, 30],
    ];
    for (const [s, w, h] of layers) {
      expect(validateSprite(id, s)).toEqual([]);
      expect([s.w, s.h]).toEqual([w, h]);
      expect(edgesClear(s)).toBe(true);
      expect(filled(s)).toBeGreaterThan(10);
    }
  });

  it("fits the ground details to the lane height, and caches them", () => {
    expect(groundDetails("spelling", 46).h).toBe(46);
    expect(groundDetails("spelling", 46)).toBe(groundDetails("spelling", 46));
  });

  it("speeds the scenery up on a streak and eases back after it", () => {
    let fast = 1;
    for (let k = 0; k < 120; k++) fast = easeScenery(fast, true, 16);
    expect(fast).toBeGreaterThan(SCENERY.streak - 0.05);
    for (let k = 0; k < 120; k++) fast = easeScenery(fast, false, 16);
    expect(fast).toBeLessThan(1.05);
    // a long frame never overshoots
    expect(easeScenery(1, true, 5000)).toBe(SCENERY.streak);
  });

  it("layers further away move slower than the ground, the front faster", () => {
    expect(SCENERY.sky).toBeLessThan(SCENERY.mid);
    expect(SCENERY.mid).toBeLessThan(1);
    expect(SCENERY.fore).toBeGreaterThan(1);
  });
});

describe("front scenery stands out from the floor and the lanes", () => {
  it.each(SCENERY_IDS)("%s", async (id) => {
    const { laneGround } = await import("@/lib/game/runner");
    const fore = foreScenery(id).frames[0].join("");
    const main = [...fore].filter((ch) => ch !== "." && ch !== "k");
    expect(main.length).toBeGreaterThan(0);
    // not the colour of the floor or of either lane it overlaps
    const g = laneGround(id);
    expect(main.filter((ch) => ch === g.a || ch === g.b || ch === g.edge)).toEqual([]);
  });
});
