import { describe, expect, it } from "vitest";
import { units } from "@/content/units";
import { AMBIENT_NAMES, MAP_H, MAP_W, PLACES, PLACE_ORDER, ROAD, catmull, pathLength, planRoute, roadDist, standOf, surfaceAt, zoneGains } from "@/components/map/layout";

describe("adventure map layout", () => {
  it("has a place for every unit, in the same order as the catalogue", () => {
    expect(PLACE_ORDER).toEqual(units.map((u) => u.id));
  });

  it("keeps every coordinate inside the artwork", () => {
    const inside = ([x, y]: readonly [number, number]) => x >= 0 && x <= MAP_W && y >= 0 && y <= MAP_H;
    for (const p of ROAD) expect(inside(p)).toBe(true);
    for (const l of Object.values(PLACES)) {
      expect(inside(l.c)).toBe(true);
      expect(inside(l.pin)).toBe(true);
      for (const s of l.spur) expect(inside(s)).toBe(true);
      expect(l.join).toBeGreaterThanOrEqual(0);
      expect(l.join).toBeLessThan(ROAD.length);
    }
  });

  it("joins each side track to the road", () => {
    for (const [id, l] of Object.entries(PLACES)) {
      const start = l.spur[0];
      const roadPoint = ROAD[l.join];
      expect(Math.hypot(start[0] - roadPoint[0], start[1] - roadPoint[1]), id).toBeLessThan(140);
    }
  });
});

describe("routes", () => {
  it("walks from one place to another along the road, ending at the destination's stand", () => {
    const route = planRoute("number-the-stars", "poetry");
    expect(route[0]).toEqual(standOf("number-the-stars"));
    expect(route[route.length - 1]).toEqual(standOf("poetry"));
    expect(pathLength(route)).toBeGreaterThan(300);
  });

  it("is reversible: the way back is about as long", () => {
    for (const [a, b] of [["the-giver", "grammar"], ["word-treasury", "number-the-stars"], ["spelling", "short-stories"]]) {
      const there = pathLength(planRoute(a, b));
      const back = pathLength(planRoute(b, a));
      expect(Math.abs(there - back) / there).toBeLessThan(0.08);
    }
  });

  it("never jumps: consecutive samples are close together", () => {
    for (const a of PLACE_ORDER) {
      for (const b of PLACE_ORDER) {
        if (a === b) continue;
        const r = planRoute(a, b);
        for (let i = 1; i < r.length; i++) expect(Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]), `${a}->${b}`).toBeLessThan(12);
      }
    }
  });

  it("smooths a polyline through its points", () => {
    const pts = [[0, 0], [100, 0], [100, 100]] as const;
    const out = catmull(pts, 5);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([100, 100]);
    expect(out.length).toBeGreaterThan(30);
  });
});

describe("ground and sound", () => {
  it("knows what is under Nova's feet", () => {
    expect(surfaceAt(380, 475)).toBe("wood"); // the bridge
    expect(surfaceAt(100, 1110)).toBe("wood"); // the jetty
    expect(surfaceAt(600, 1100)).toBe("snow"); // the grey village
    expect(surfaceAt(ROAD[10][0], ROAD[10][1])).toBe("dirt");
    expect(roadDist(ROAD[10][0], ROAD[10][1])).toBe(0);
    expect(surfaceAt(20, 700)).toBe("grass");
  });

  it("lets the artwork mark extra snow", () => {
    expect(surfaceAt(20, 700, () => true)).toBe("snow");
  });

  it("fades the countryside mix with her position", () => {
    const harbour = zoneGains(110, 1190);
    const tower = zoneGains(140, 300);
    const cave = zoneGains(350, 150);
    expect(harbour.sea).toBeGreaterThan(0.9);
    expect(tower.sea).toBe(0);
    expect(tower.workshop).toBeGreaterThan(0.9);
    expect(cave.cave).toBeGreaterThan(0.9);
    for (const g of [harbour, tower, cave]) {
      for (const n of AMBIENT_NAMES) {
        expect(g[n]).toBeGreaterThanOrEqual(0);
        expect(g[n]).toBeLessThanOrEqual(1);
      }
    }
  });
});
