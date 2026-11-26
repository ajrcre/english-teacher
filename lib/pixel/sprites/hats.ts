import { PixelCanvas, sprite, type Sprite } from "../canvas";

/**
 * Hats for Nova, bought in the star shop. Each hat is drawn on its own small canvas with its
 * bottom-centre at (ANCHOR_X, ANCHOR_Y); Nova's sprites stamp it onto her head in every pose.
 * Two sizes: "front" (battle Nova, a wide head) and "side" (journey Nova, a narrower head).
 */
export const HAT_IDS = ["party", "beanie", "flower", "pirate", "wizard", "crown", "e"] as const;
export type HatId = (typeof HAT_IDS)[number];

export const ANCHOR_X = 8;
export const ANCHOR_Y = 12;

const LIGHT: Record<string, string> = { V: "v", u: "V", S: "s", m: "u", a: "Y", A: "a", L: "l", h: "L", r: "p" };
const DARK: Record<string, string> = { v: "V", V: "u", s: "S", S: "h", a: "A", Y: "a", l: "L", L: "h" };

function draw(id: HatId, view: "front" | "side"): PixelCanvas {
  const c = new PixelCanvas(16, 14);
  const cx = ANCHOR_X;
  const by = ANCHOR_Y;
  const hw = view === "front" ? 5 : 3; // half width
  const tall = view === "front" ? 1 : 0.8;
  const H = (n: number) => Math.max(1, Math.round(n * tall));

  switch (id) {
    case "party": {
      c.tri(cx - hw + 0.5, by + 0.5, cx + hw + 0.5, by + 0.5, cx + 0.5, by - H(8), "V");
      for (let y = by; y > by - H(8); y -= 3) for (let x = 0; x < 16; x++) if (c.get(x, y) === "V") c.set(x, y, "y");
      c.ellipse(cx, by - H(8) - 1, 1.2, 1.2, "w");
      break;
    }
    case "beanie": {
      c.ellipse(cx, by, hw, H(4), "S");
      for (let x = cx - hw; x <= cx + hw; x += 2) c.vline(x, by - H(3), by - 1, "h");
      c.hline(cx - hw, cx + hw, by, "s").hline(cx - hw, cx + hw, by - 1, "s");
      c.ellipse(cx, by - H(4) - 1, 1.4, 1.2, "w");
      break;
    }
    case "flower": {
      c.hline(cx - hw - 1, cx + hw + 1, by, "L");
      c.hline(cx - hw, cx + hw, by - 1, "h");
      const petals = ["p", "y", "w", "v"];
      let i = 0;
      for (let x = cx - hw; x <= cx + hw; x += 2) {
        const col = petals[i++ % petals.length];
        c.set(x, by - 1, col).set(x, by - 2, col).set(x - 1, by - 1, col).set(x + 1, by - 1, col);
        c.set(x, by - 1, "a");
      }
      break;
    }
    case "pirate": {
      c.rect(cx - hw + 1, by - H(4), 2 * hw - 1, H(4), "m");
      c.ellipse(cx, by - H(4), hw - 1, 1.5, "m");
      c.hline(cx - hw - 2, cx + hw + 2, by, "m");
      c.set(cx - hw - 2, by - 1, "m").set(cx + hw + 2, by - 1, "m");
      c.hline(cx - hw - 1, cx + hw + 1, by - 1, "A");
      // a little white skull
      c.set(cx, by - H(3), "w").set(cx - 1, by - H(3), "w").set(cx + 1, by - H(3), "w").set(cx, by - H(3) + 1, "w");
      break;
    }
    case "wizard": {
      c.hline(cx - hw - 2, cx + hw + 2, by, "u");
      c.hline(cx - hw - 1, cx + hw + 1, by - 1, "u");
      c.tri(cx - hw + 1, by - 1.5, cx + hw, by - 1.5, cx + 2, by - H(11), "V");
      c.set(cx + 3, by - H(11), "V").set(cx + 4, by - H(11) + 1, "V"); // the tip flops over
      c.set(cx - 1, by - H(4), "y").set(cx + 1, by - H(7), "y").set(cx + 2, by - H(3), "Y");
      break;
    }
    case "crown": {
      const peak = view === "front" ? 5 : 3; // a lower crown from the side, or it looks like a glove
      c.rect(cx - hw + 1, by - 2, 2 * hw - 1, 3, "a");
      for (const x of [cx - hw + 1, cx, cx + hw - 1]) {
        c.vline(x, by - peak, by - 2, "a");
        c.set(x, by - peak - 1, "y");
      }
      if (hw > 3)
        for (const x of [cx - hw + 3, cx + hw - 3]) c.vline(x, by - H(3), by - 2, "a");
      c.set(cx, by - 1, "r");
      c.hline(cx - hw + 1, cx + hw - 1, by, "A");
      break;
    }
    case "e": {
      // The Grey Fox's hat, won by beating him: a tall dark hat with a red band and a big E.
      const h = H(7);
      c.rect(cx - hw + 1, by - h, 2 * hw - 1, h, "u");
      c.hline(cx - hw - 1, cx + hw + 1, by, "m");
      c.hline(cx - hw + 1, cx + hw - 1, by - 1, "R");
      const top = by - h + 1;
      const bottom = by - 2;
      const mid = Math.round((top + bottom) / 2);
      c.vline(cx - 1, top, bottom, "w");
      for (const y of [top, mid, bottom]) c.hline(cx - 1, cx + 1, y, "w");
      break;
    }
  }
  c.shade(LIGHT, DARK);
  c.outline("k");
  return c;
}

const cache = new Map<string, PixelCanvas>();

/** The hat's canvas for a view (shaded and outlined), with its bottom-centre at (ANCHOR_X, ANCHOR_Y). */
export function hatCanvas(id: HatId, view: "front" | "side"): PixelCanvas {
  const key = `${id}:${view}`;
  let c = cache.get(key);
  if (!c) cache.set(key, (c = draw(id, view)));
  return c;
}

/** A hat on its own, as a sprite (e.g. dropped on the ground after a battle). */
export function hatSprite(id: HatId, view: "front" | "side" = "front"): Sprite {
  return sprite(hatCanvas(id, view));
}

export function isHat(id: string | null | undefined): id is HatId {
  return !!id && (HAT_IDS as readonly string[]).includes(id);
}

/** The hat sprite for a shop item id ("hat-wizard" → "wizard"), or null. */
export function hatOf(shopId: string | null | undefined): HatId | null {
  const id = shopId?.replace(/^hat-/, "");
  return isHat(id) ? id : null;
}
