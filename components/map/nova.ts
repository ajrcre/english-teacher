import { ART, make, place } from "./dom";
import { pathLength, planRoute, standOf, type Point, type Surface } from "./layout";

type View = "side" | "trot" | "away" | "toward";
type Pose = "sit" | "look-up" | "sniff" | "stretch" | "scratch" | "yawn" | "wave" | "pounce" | "sleep";
type Sprite = View | Pose;

/** Width of each sprite in map pixels. Strips are 8-frame walk cycles; the rest are single poses. */
const POSE_WIDTH: Record<Pose, number> = { sit: 71, "look-up": 73.5, sniff: 121, stretch: 83.3, scratch: 65.9, yawn: 83.3, wave: 84.7, pounce: 117.3, sleep: 98.8 };
/** Map pixels of road covered by one full 8-frame cycle. */
const STRIDE: Record<View, number> = { side: 118, trot: 175, away: 90, toward: 90 };
const FACES_FRONT: readonly string[] = ["sit", "look-up", "scratch", "yawn", "wave"];
const IDLE_ACTS: readonly Pose[] = ["look-up", "scratch", "yawn", "sniff", "stretch", "wave"];
const SLEEP_AFTER_MS = 28000;
const ease = (t: number) => t * t * (3 - 2 * t);

export interface NovaHooks {
  surfaceAt(x: number, y: number): Surface;
  /** A paw touched down. `pan` is -1 (left of the map) to 1 (right). */
  onStep(surface: Surface, strength: number, pan: number): void;
  onDust(x: number, y: number, surface: Surface): void;
  /** Lets the page scroll along when she walks off screen. */
  follow(el: HTMLElement): void;
}

interface Ctx {
  nova: Nova;
  dt: number;
  now: number;
  t: number;
}
type StateKind = "sit" | "act" | "sleep" | "hop" | "walk";
interface State {
  readonly kind: StateKind;
  enter(nova: Nova, now: number): void;
  update(c: Ctx): void;
  exit?(nova: Nova): void;
}

/**
 * Nova the fox. A small state machine (sit, act, sleep, hop, walk) drives which sprite is shown,
 * so each behaviour lives in its own class and the animation loop only calls `update`.
 */
export class Nova {
  x = 0;
  y = 0;
  flip: 1 | -1 = 1;
  placeId: string;
  readonly root: HTMLElement;
  readonly face: HTMLElement;
  private readonly glow: HTMLElement;
  private readonly sprites = {} as Record<Sprite, HTMLElement>;
  private current: Sprite = "sit";
  private state: State | null = null;
  lastAct: Pose | "" = "";
  idleSince = performance.now();

  constructor(parent: HTMLElement, startId: string, readonly hooks: NovaHooks, private readonly reduced: boolean) {
    this.placeId = startId;
    this.root = make("div", "am-nova", parent);
    this.root.setAttribute("aria-hidden", "true");
    make("div", "am-nova-shadow", this.root);
    this.glow = make("div", "am-nova-glow", this.root);
    this.face = make("div", "am-nova-face", this.root);
    (["side", "trot", "away", "toward"] as const).forEach((v) => {
      const d = make("div", `am-strip am-v-${v}`, this.face);
      d.hidden = true;
      this.sprites[v] = d;
    });
    (Object.keys(POSE_WIDTH) as Pose[]).forEach((p) => {
      const i = make("img", "am-pose", this.face);
      i.src = `${ART}/${p === "sleep" ? "nova-sleep" : `pose-${p}`}.webp`;
      i.alt = "";
      i.draggable = false;
      i.hidden = true;
      i.style.width = `calc(var(--px) * ${POSE_WIDTH[p]})`;
      this.sprites[p] = i;
    });
    const s = standOf(startId);
    this.setPos(s[0], s[1]);
    this.transition(new SitState(), performance.now());
  }

  get mode(): StateKind | "none" {
    return this.state?.kind ?? "none";
  }

  get view(): string {
    return this.current;
  }

  setPos(x: number, y: number): void {
    this.x = x;
    this.y = y;
    place(this.root, x, y);
  }

  show(k: Sprite): void {
    if (this.current === k) return;
    for (const n in this.sprites) this.sprites[n as Sprite].hidden = n !== k;
    this.current = k;
  }

  transition(next: State, now = performance.now()): void {
    this.state?.exit?.(this);
    this.state = next;
    next.enter(this, now);
  }

  /** Any activity wakes her up (and ends a nap with a stretch). */
  wake(now = performance.now()): void {
    this.idleSince = now;
    this.root.querySelectorAll(".am-zz").forEach((z) => z.remove());
    if (this.state?.kind === "sleep") this.transition(new ActState("stretch", 1800), now);
  }

  walkTo(id: string, now = performance.now()): void {
    this.wake(now);
    if (id === this.placeId) {
      this.transition(new HopState(), now);
      return;
    }
    const route = planRoute(this.placeId, id);
    this.placeId = id;
    if (this.reduced) {
      const e = route[route.length - 1];
      this.setPos(e[0], e[1]);
      this.transition(new HopState(), now);
      return;
    }
    this.transition(new WalkState(route), now);
  }

  update(dt: number, now: number, t: number): void {
    this.glow.style.opacity = (0.8 + Math.sin(t * 7.3) * 0.08 + Math.sin(t * 11.9 + 1) * 0.06).toFixed(3); // the lantern flickers
    this.state?.update({ nova: this, dt, now, t });
  }

  /** Mirror for poses that have a facing, with a little breathing. */
  idleTransform(t: number): string {
    const sx = FACES_FRONT.includes(this.current) ? 1 : this.flip;
    return `scaleX(${sx}) scaleY(${1 + Math.sin(t * 2.1) * 0.012})`;
  }
}

class SitState implements State {
  readonly kind = "sit";
  private nextAct = 0;
  enter(n: Nova, now: number): void {
    n.show("sit");
    this.nextAct = now + 4500 + Math.random() * 4000;
  }
  update({ nova, now, t }: Ctx): void {
    nova.face.style.transform = nova.idleTransform(t);
    if (now - nova.idleSince > SLEEP_AFTER_MS) nova.transition(new SleepState(), now);
    else if (now > this.nextAct) {
      const opts = IDLE_ACTS.filter((o) => o !== nova.lastAct);
      const pick = opts[Math.floor(Math.random() * opts.length)];
      nova.lastAct = pick;
      nova.transition(new ActState(pick, 2400 + Math.random() * 800), now);
    }
  }
}
class ActState implements State {
  readonly kind = "act";
  private end = 0;
  constructor(private readonly pose: Pose, private readonly ms: number) {}
  enter(n: Nova, now: number): void {
    n.show(this.pose);
    this.end = now + this.ms;
  }
  update({ nova, now, t }: Ctx): void {
    nova.face.style.transform = nova.idleTransform(t);
    if (now > this.end) nova.transition(new SitState(), now);
  }
}

class SleepState implements State {
  readonly kind = "sleep";
  private zz = 0;
  enter(n: Nova): void {
    n.show("sleep");
  }
  update({ nova, dt, t }: Ctx): void {
    nova.face.style.transform = nova.idleTransform(t);
    this.zz -= dt;
    if (this.zz <= 0) {
      this.zz = 1.4;
      const z = make("div", "am-zz", nova.root);
      z.textContent = "z";
      z.style.left = "calc(var(--px) * 24)";
      z.style.top = "calc(var(--px) * -70)";
      setTimeout(() => z.remove(), 2800);
    }
  }
}

class HopState implements State {
  readonly kind = "hop";
  private timer: ReturnType<typeof setTimeout> | undefined;
  enter(n: Nova, now: number): void {
    n.show("pounce");
    n.face.style.transform = "";
    n.face.classList.remove("am-hopping");
    void n.face.offsetWidth;
    n.face.classList.add("am-hopping");
    n.idleSince = now;
    this.timer = setTimeout(() => {
      n.face.classList.remove("am-hopping");
      if (n.mode === "hop") n.transition(new SitState());
    }, 900);
  }
  update(): void {}
  exit(n: Nova): void {
    clearTimeout(this.timer);
    n.face.classList.remove("am-hopping");
  }
}

class WalkState implements State {
  readonly kind = "walk";
  private readonly length: number;
  private readonly gait: "walk" | "trot";
  private rd = 0;
  private hx = 0;
  private hy = 0;
  private view: View = "side";
  private lastFrame = -1;
  constructor(private readonly route: Point[]) {
    this.length = pathLength(route);
    this.gait = this.length > 520 ? "trot" : "walk";
  }
  enter(n: Nova): void {
    n.show("side");
  }
  update({ nova: n, dt }: Ctx): void {
    const route = this.route;
    // ease in over the first 40 px and out over the last 55 px
    const vmax = this.gait === "trot" ? 215 : 100;
    const v = Math.max(28, vmax * ease(Math.min(1, this.rd / 45 + 0.15)) * ease(Math.min(1, (this.length - this.rd) / 55 + 0.05)));
    const bx = n.x;
    const by = n.y;
    this.rd += v * dt;
    let rem = this.rd;
    let idx = 0;
    while (idx < route.length - 1) {
      const seg = Math.hypot(route[idx + 1][0] - route[idx][0], route[idx + 1][1] - route[idx][1]);
      if (rem <= seg) break;
      rem -= seg;
      idx++;
    }
    if (idx >= route.length - 1) {
      const e = route[route.length - 1];
      n.setPos(e[0], e[1]);
      n.transition(new HopState());
      return;
    }
    const a = route[idx];
    const b = route[idx + 1];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    n.setPos(a[0] + ((b[0] - a[0]) * rem) / seg, a[1] + ((b[1] - a[1]) * rem) / seg);

    // heading, smoothed so curves don't flip the view back and forth
    const dx = n.x - bx;
    const dy = n.y - by;
    const m = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, dt * 7);
    this.hx += (dx / m - this.hx) * k;
    this.hy += (dy / m - this.hy) * k;
    const sideView: View = this.gait === "trot" ? "trot" : "side";
    const vertical = this.view === "away" || this.view === "toward";
    if (!vertical && Math.abs(this.hy) > Math.abs(this.hx) * 1.3) this.view = this.hy < 0 ? "away" : "toward";
    else if (vertical && Math.abs(this.hx) > Math.abs(this.hy) * 1.3) this.view = sideView;
    else if (vertical) this.view = this.hy < 0 ? "away" : "toward";
    else this.view = sideView;
    if (Math.abs(this.hx) > 0.25) n.flip = this.hx >= 0 ? 1 : -1;
    n.show(this.view);

    const frame = Math.floor(this.rd / (STRIDE[this.view] / 8)) % 8;
    (n.face.querySelector(`.am-v-${this.view}`) as HTMLElement).style.backgroundPosition = `${frame * (100 / 7)}% 0`;
    n.face.style.transform = this.view === "side" || this.view === "trot" ? `scaleX(${n.flip})` : "";
    if (frame !== this.lastFrame) {
      this.footfall(n, frame);
      this.lastFrame = frame;
    }
    n.hooks.follow(n.root);
  }
  /** Sound and dust when a paw lands, which depends on the gait and the ground. */
  private footfall(n: Nova, frame: number): void {
    const surf = n.hooks.surfaceAt(n.x, n.y);
    const pan = n.x / 350 - 1;
    if (this.view === "trot") {
      if (frame % 4 === 0) {
        n.hooks.onStep(surf, 1.15, pan);
        n.hooks.onDust(n.x, n.y, surf);
      } else if (frame % 4 === 2) n.hooks.onStep(surf, 0.7, pan);
    } else if (frame % 2 === 0) {
      n.hooks.onStep(surf, [1, 0.55, 0.92, 0.55][frame / 2], pan);
      if (frame % 4 === 0) n.hooks.onDust(n.x + (Math.random() - 0.5) * 20, n.y, surf);
    }
  }
}
