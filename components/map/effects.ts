import { make, place, pct, sprite, ART } from "./dom";
import { MAP_W, type Point } from "./layout";

const WATER_SPOTS: readonly Point[] = [
  [60, 1198], [125, 1218], [205, 1190], [178, 1160], [38, 1172], [250, 1232], [110, 1178], [565, 752], [606, 772], [655, 746],
  [622, 738], [96, 486], [150, 480], [470, 486], [525, 496], [600, 486], [330, 485], [26, 468],
];
const SNOW_ZONES: readonly (readonly [number, number, number, number, number])[] = [[430, 880, 270, 374, 46], [440, 525, 260, 175, 22], [505, 705, 195, 95, 10]];
const HIVE = { x: 572, y: 292, rx: 95, ry: 52 };

interface Bee {
  w: HTMLElement;
  up: HTMLElement;
  dn: HTMLElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tgt: Point;
  hold: number;
  face: 1 | -1;
  turn: number;
  ph: number;
  wph: number;
  tilt: number;
}
interface Flake {
  z: number;
  x: number;
  y: number;
  r: number;
  v: number;
  s: number;
  big: boolean;
}

export interface EffectLayers {
  stage: HTMLElement;
  back: HTMLElement;
  front: HTMLElement;
  ripples: SVGGElement;
  snow: HTMLCanvasElement;
}

/**
 * Everything that moves on the map besides Nova: drifting clouds, ripples, chimney smoke, the
 * lantern glow, sparkles on the treasure, bees at the hive, a bird crossing the sky and snowfall.
 * Static pieces use CSS animations; bees, the bird and snow are driven from `update`.
 */
export class AmbientEffects {
  private readonly bees: Bee[];
  private readonly bird: HTMLImageElement;
  private readonly flake = new Image();
  private readonly ctx: CanvasRenderingContext2D | null;
  private flakes: Flake[] = [];
  private scale = 1;
  private wing = 0;
  private birdT = -1;
  private nextBird = performance.now() + 5000;
  private doneEls: HTMLElement[] = [];

  /** Called when the bird takes off, so the soundscape can chirp. */
  onBird: (() => void) | null = null;

  constructor(private readonly layers: EffectLayers) {
    const { back, front, ripples, snow } = layers;
    this.ctx = snow.getContext("2d");
    this.flake.src = `${ART}/snowflake.webp`;

    ([[-8, 135, 150, 0], [26, 105, 210, 1], [6, 120, 175, 2]] as const).forEach(([y, w, dur, k], n) => {
      const c = sprite(front, `cloud-${k}`, 0, y, w, "am-cloud");
      c.style.transform = "none";
      c.style.left = "0";
      c.style.animationDuration = `${dur}s`;
      c.style.animationDelay = `${-dur * (0.2 + 0.23 * n)}s`;
    });
    WATER_SPOTS.forEach(([x, y], n) => {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("class", "am-rip");
      p.setAttribute("d", `M${x} ${y} q4 -4 8 0 t8 0`);
      p.style.animationDelay = `${-(n * 0.73) % 4.2}s`;
      ripples.appendChild(p);
    });
    ([[100, 150, 0], [100, 150, 1.7], [100, 150, 3.4], [46, 985, 0.6], [46, 985, 2.3], [46, 985, 4.0]] as const).forEach(([x, y, d], n) => {
      const s = sprite(front, n % 2 ? "smoke-a" : "smoke-b", x, y, n < 3 ? 34 : 28, "am-puff");
      s.style.animationDelay = `${d}s`;
    });
    const glow = make("div", "am-beam", back);
    place(glow, 283, 1000);
    glow.style.width = pct(48, MAP_W);
    glow.style.aspectRatio = "1";
    ([[325, 178], [362, 168], [388, 198], [348, 206], [400, 170], [318, 200], [372, 188]] as const).forEach(([x, y], n) => {
      const s = sprite(front, n % 2 ? "sparkle" : "sparkle-2", x, y, 15 + (n % 3) * 4, "am-sparkle");
      s.style.transform = "translate(-50%, -50%)";
      s.style.animationDelay = `${n * 0.37}s`;
      s.style.animationDuration = `${2.2 + (n % 3) * 0.5}s`;
    });

    this.bees = [0, 1, 2].map((n) => {
      const w = make("div", null, front);
      w.style.cssText = `position:absolute;width:${pct(34, MAP_W)};aspect-ratio:102/111;transform:translate(-50%,-50%);will-change:transform`;
      const mk = (file: string) => {
        const i = make("img", null, w);
        i.src = `${ART}/${file}.webp`;
        i.alt = "";
        i.draggable = false;
        i.style.cssText = "position:absolute;left:0;top:0;width:100%";
        return i;
      };
      const up = mk("bee-up");
      const dn = mk("bee-down-r");
      dn.style.opacity = "0";
      const p = this.pickTarget();
      return { w, up, dn, x: p[0], y: p[1], vx: 18 * (n - 1) + 12, vy: 0, tgt: this.pickTarget(), hold: 0, face: 1, turn: 1, ph: n * 1.7, wph: n * 0.031, tilt: 0 } satisfies Bee;
    });
    this.bird = sprite(front, "bird", -60, 300, 44, "am-bird");
    this.bird.style.transform = "translate(-50%, -50%)";
    this.resize();
  }

  /** Sparkles over the pins of places that are completely finished. */
  setFinished(pins: readonly Point[]): void {
    this.doneEls.forEach((e) => e.remove());
    this.doneEls = [];
    for (const [x, y] of pins) {
      for (let k = 0; k < 3; k++) {
        const s = sprite(this.layers.front, k % 2 ? "sparkle" : "sparkle-2", x + (k - 1) * 26, y - 24 + (k % 2) * 40, 13, "am-sparkle");
        s.style.transform = "translate(-50%, -50%)";
        s.style.animationDelay = `${k * 0.6}s`;
        this.doneEls.push(s);
      }
    }
  }

  resize(): void {
    const { snow, stage } = this.layers;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    snow.width = Math.round(stage.clientWidth * dpr);
    snow.height = Math.round(stage.clientHeight * dpr);
    this.scale = snow.width / MAP_W;
    if (!this.flakes.length) this.seedSnow();
  }

  update(dt: number, t: number, now: number): void {
    this.updateBees(dt);
    this.updateBird(dt, now);
    this.updateSnow(dt, t);
  }

  dispose(): void {
    const { back, front, ripples } = this.layers;
    back.replaceChildren();
    front.replaceChildren();
    ripples.replaceChildren();
  }

  // ---- internals ----

  private pickTarget(): Point {
    return [HIVE.x + (Math.random() * 2 - 1) * HIVE.rx, HIVE.y + (Math.random() * 2 - 1) * HIVE.ry];
  }

  private seedSnow(): void {
    const k = this.layers.stage.clientWidth < 460 ? 0.6 : 1;
    SNOW_ZONES.forEach(([x, y, w, h, n], z) => {
      for (let i = 0; i < n * k; i++) this.flakes.push({ z, x: x + Math.random() * w, y: y + Math.random() * h, r: 1.2 + Math.random() * 2.2, v: 10 + Math.random() * 18, s: Math.random() * 6.28, big: Math.random() < 0.14 });
    });
  }

  /** Bees steer between waypoints near the hive and only turn once clearly heading the other way. */
  private updateBees(dt: number): void {
    this.wing += dt;
    for (const b of this.bees) {
      if (b.hold > 0) {
        b.hold -= dt;
        b.vx *= Math.pow(0.35, dt);
        b.vy *= Math.pow(0.35, dt);
      } else {
        const dx = b.tgt[0] - b.x;
        const dy = b.tgt[1] - b.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 10) {
          b.hold = 0.25 + Math.random() * 0.7;
          const c1 = this.pickTarget();
          const c2 = this.pickTarget();
          b.tgt = (c1[0] - b.x) * b.face > (c2[0] - b.x) * b.face ? c1 : c2; // prefer a spot ahead
        } else {
          const sp = Math.min(46, 14 + d * 0.8);
          const k = 1 - Math.pow(0.04, dt);
          b.vx += ((dx / d) * sp - b.vx) * k;
          b.vy += ((dy / d) * sp - b.vy) * k;
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.vx > 9) b.face = 1;
      else if (b.vx < -9) b.face = -1;
      b.turn += (b.face - b.turn) * (1 - Math.pow(0.0005, dt));
      b.tilt += (Math.max(-14, Math.min(14, b.vx * 0.32 * b.face)) - b.tilt) * (1 - Math.pow(0.02, dt));
      place(b.w, b.x, b.y + Math.sin(this.wing * 3.2 + b.ph) * 2.2);
      const sx = Math.abs(b.turn) < 0.12 ? Math.sign(b.turn || 1) * 0.12 : b.turn;
      b.w.style.transform = `translate(-50%, -50%) scaleX(${sx.toFixed(3)}) rotate(${b.tilt.toFixed(1)}deg)`;
      const flap = Math.floor((this.wing + b.wph) / 0.045) % 2 === 0;
      b.up.style.opacity = flap ? "1" : "0";
      b.dn.style.opacity = flap ? "0" : "1";
    }
  }

  private updateBird(dt: number, now: number): void {
    if (this.birdT < 0 && now > this.nextBird) {
      this.birdT = 0;
      this.onBird?.();
    }
    if (this.birdT < 0) return;
    this.birdT += dt;
    const u = this.birdT / 16;
    if (u > 1) {
      this.birdT = -1;
      this.nextBird = now + 14000 + Math.random() * 14000;
      place(this.bird, -60, 300);
    } else place(this.bird, 780 - u * 880, 330 + Math.sin(u * 7) * 18 - u * 40);
  }

  private updateSnow(dt: number, t: number): void {
    const cx = this.ctx;
    if (!cx) return;
    const { snow } = this.layers;
    const scale = this.scale;
    cx.clearRect(0, 0, snow.width, snow.height);
    for (const f of this.flakes) {
      f.y += f.v * dt;
      f.x += Math.sin(t * 0.8 + f.s) * 7 * dt;
      const [zx, zy, zw, zh] = SNOW_ZONES[f.z];
      if (f.y > zy + zh) {
        f.y = zy - 4;
        f.x = zx + Math.random() * zw;
      }
      if (f.x < zx) f.x = zx + zw;
      if (f.x > zx + zw) f.x = zx;
      const X = f.x * scale;
      const Y = f.y * scale;
      if (f.big && this.flake.complete) {
        const s = 11 * scale;
        cx.save();
        cx.translate(X, Y);
        cx.rotate(t * 0.4 + f.s);
        cx.globalAlpha = 0.95;
        cx.drawImage(this.flake, -s / 2, -s / 2, s, s);
        cx.restore();
      } else {
        cx.globalAlpha = 0.92;
        cx.fillStyle = "#fff";
        cx.beginPath();
        cx.arc(X, Y, f.r * scale * 0.7, 0, 6.2832);
        cx.fill();
        cx.strokeStyle = "rgb(120 140 170 / 0.35)";
        cx.lineWidth = 0.6 * scale;
        cx.stroke();
      }
    }
  }
}
