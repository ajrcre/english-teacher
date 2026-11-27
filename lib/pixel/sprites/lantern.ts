import { PixelCanvas, sprite, type Sprite } from "../canvas";

/**
 * Nova's lantern attack: she raises her lantern and a ball of its light flies at the foe, then
 * bursts on him in a flash of rays. (Instead of a sword: Nova fights with light.)
 */
export const ORB_SIZE = 11;
export const BURST_SIZE = 27;

/** The ball of light in flight (3 frames: it pulses and its sparks turn). */
export const lightOrb: Sprite = sprite(
  ...[0, 1, 2].map((f) => {
    const c = new PixelCanvas(ORB_SIZE, ORB_SIZE);
    const m = (ORB_SIZE - 1) / 2;
    c.ellipse(m, m, 4.2 + (f === 1 ? 0.5 : 0), 4.2 + (f === 1 ? 0.5 : 0), "a");
    c.ellipse(m, m, 3, 3, "y");
    c.ellipse(m, m, 1.6, 1.6, "f");
    c.set(m, m, "w").set(m - 1, m - 1, "w");
    // four sparks around it, turning
    const r = 5;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + (f * Math.PI) / 6;
      c.set(Math.round(m + Math.cos(a) * r), Math.round(m + Math.sin(a) * r), "f");
    }
    return c;
  }),
);

/** The light bursting on the foe (4 frames: a flash, rays shooting out, then fading sparkles). */
export const lightBurst: Sprite = sprite(
  ...[0, 1, 2, 3].map((f) => {
    const c = new PixelCanvas(BURST_SIZE, BURST_SIZE);
    const m = (BURST_SIZE - 1) / 2;
    const core = [5, 4, 2.5, 0][f];
    if (core > 0) {
      c.ellipse(m, m, core + 1.5, core + 1.5, "y");
      c.ellipse(m, m, core, core, "f");
      c.ellipse(m, m, Math.max(1, core - 2), Math.max(1, core - 2), "w");
    }
    // eight rays, longer each frame, broken into dashes as they fade
    const from = [3, 5, 7, 9][f];
    const to = [7, 10, 12, 13][f];
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4;
      for (let d = from; d <= to; d++) {
        if (f === 3 && d % 2) continue;
        const x = Math.round(m + Math.cos(a) * d);
        const y = Math.round(m + Math.sin(a) * d);
        c.set(x, y, d > to - 2 ? "y" : "f");
      }
    }
    // sparkles drifting out between the rays
    if (f >= 2)
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4 + Math.PI / 8;
        const d = f === 2 ? 8 : 11;
        c.set(Math.round(m + Math.cos(a) * d), Math.round(m + Math.sin(a) * d), "w");
      }
    return c;
  }),
);

export const BULB_W = 9;
export const BULB_H = 14;

/**
 * The castle's hanging light bulb, which the Grey Fox switches off on his last life
 * (2 frames: lit, off). Its cord is drawn separately, from the top of the scene.
 */
export const bulb: Sprite = sprite(
  ...[true, false].map((lit) => {
    const c = new PixelCanvas(BULB_W, BULB_H);
    // metal cap
    c.rect(3, 0, 3, 3, "g").hline(3, 5, 1, "G");
    // glass
    c.ellipse(4, 7.5, 3.5, 4, lit ? "y" : "G");
    c.ellipse(4, 7, 2.5, 3, lit ? "f" : "<");
    // filament
    c.hline(3, 5, 8, lit ? "a" : "g").set(3, 7, lit ? "a" : "g").set(5, 7, lit ? "a" : "g");
    if (lit) c.set(2, 5, "w").set(2, 6, "w");
    c.outline("k");
    return c;
  }),
);
