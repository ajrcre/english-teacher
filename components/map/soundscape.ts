import { AMBIENT_NAMES, type AmbientName, type Surface } from "./layout";

const SURFACE_GAIN: Record<Surface, number> = { dirt: 0.9, grass: 0.8, snow: 1, wood: 1 };
const SURFACES: readonly Surface[] = ["dirt", "grass", "snow", "wood"];
const STEP_VARIANTS = 3;
const BIRDS = ["bird-1", "bird-2", "bird-3"] as const;
const CROSSFADE_S = 1.8;

type Zones = Record<AmbientName, number>;

/**
 * The sounds of the map: footsteps that change with the ground, and a countryside mix that follows
 * Nova (sea at the harbour, clockwork at the tower, ...). Everything is optional: if a file or the
 * Web Audio API is missing the map simply stays quiet.
 *
 * Browsers only allow audio after a tap, so nothing is created until `unlock()` is called from one.
 */
export class MapSoundscape {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private stepBus: GainNode | null = null;
  private natureBus: GainNode | null = null;
  private zoneGain = new Map<AmbientName, GainNode>();
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private timers = new Set<ReturnType<typeof setInterval | typeof setTimeout>>();
  private muted = false;
  private lastVariant = 0;
  private getZones: (() => Zones) | null = null;
  private disposed = false;

  constructor(private readonly baseUrl = "/audio/map") {}

  get active(): boolean {
    return !!this.ac && this.ac.state === "running" && !this.muted;
  }

  /** Call from a tap/click. Creates the audio context, loads the sounds and starts the ambience. */
  async unlock(): Promise<void> {
    if (this.disposed || this.muted) return;
    if (!this.ac) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ac = new Ctor();
      this.master = this.ac.createGain();
      this.master.connect(this.ac.destination);
      this.stepBus = this.ac.createGain();
      this.natureBus = this.ac.createGain();
      this.stepBus.connect(this.master);
      this.natureBus.connect(this.master);
    }
    try {
      await this.ac.resume();
    } catch {
      return;
    }
    this.master?.gain.setTargetAtTime(1, this.ac.currentTime, 0.08);
    if (!this.loading) this.loading = this.load().then(() => this.startAmbience());
    await this.loading;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    const ac = this.ac;
    if (!ac || !this.master) return;
    if (muted) {
      this.master.gain.setTargetAtTime(0, ac.currentTime, 0.08);
      this.timers.add(setTimeout(() => void ac.suspend().catch(() => undefined), 400));
    } else {
      void ac.resume().then(() => this.master?.gain.setTargetAtTime(1, ac.currentTime, 0.08)).catch(() => undefined);
    }
  }

  /** Pause while the page is hidden; resume when it comes back (unless muted). */
  setVisible(visible: boolean): void {
    const ac = this.ac;
    if (!ac) return;
    if (!visible) void ac.suspend().catch(() => undefined);
    else if (!this.muted) void ac.resume().catch(() => undefined);
  }

  /** Steer the countryside mix. Called a few times a second with the zone volumes at Nova's position. */
  setZones(zones: Zones): void {
    const ac = this.ac;
    if (!ac) return;
    for (const name of AMBIENT_NAMES) this.zoneGain.get(name)?.gain.setTargetAtTime(zones[name] * (name === "meadow" ? 0.9 : 1), ac.currentTime, 0.45);
  }

  /** Occasional birdsong, only where it is not snowing. */
  scheduleBirds(zones: () => Zones): void {
    this.getZones = zones;
    const next = () => {
      const t = setTimeout(() => {
        this.timers.delete(t);
        if (this.active && (this.getZones?.().snow ?? 0) < 0.5) this.play(BIRDS[Math.floor(Math.random() * BIRDS.length)], { gain: 0.35 + Math.random() * 0.25, pan: Math.random() * 2 - 1, bus: this.natureBus });
        if (!this.disposed) next();
      }, 11000 + Math.random() * 16000);
      this.timers.add(t);
    };
    next();
  }

  /** A single bird call, e.g. when one flies across the sky. */
  bird(): void {
    this.play(BIRDS[Math.floor(Math.random() * 2)], { gain: 0.5, pan: 0.5, bus: this.natureBus });
  }

  step(surface: Surface, strength: number, pan: number): void {
    if (!this.active) return;
    let v: number;
    do v = 1 + Math.floor(Math.random() * STEP_VARIANTS);
    while (v === this.lastVariant);
    this.lastVariant = v;
    this.play(`step-${surface}-${v}`, { gain: SURFACE_GAIN[surface] * strength * (0.8 + Math.random() * 0.25), rate: 0.93 + Math.random() * 0.14, pan: pan * 0.55, bus: this.stepBus });
  }

  dispose(): void {
    this.disposed = true;
    for (const t of this.timers) {
      clearInterval(t);
      clearTimeout(t);
    }
    this.timers.clear();
    void this.ac?.close().catch(() => undefined);
    this.ac = null;
  }

  // ---- internals ----

  private async load(): Promise<void> {
    const ac = this.ac;
    if (!ac) return;
    const names = [
      ...SURFACES.flatMap((s) => Array.from({ length: STEP_VARIANTS }, (_, i) => `step-${s}-${i + 1}`)),
      ...AMBIENT_NAMES.map((n) => `amb-${n}`),
      ...BIRDS,
    ];
    await Promise.all(
      names.map(async (n) => {
        try {
          const res = await fetch(`${this.baseUrl}/${n}.mp3`);
          if (!res.ok) return;
          this.buffers.set(n, await ac.decodeAudioData(await res.arrayBuffer()));
        } catch {
          /* a missing sound is just silence */
        }
      }),
    );
  }

  private startAmbience(): void {
    const ac = this.ac;
    if (!ac || !this.natureBus || this.disposed) return;
    for (const name of AMBIENT_NAMES) {
      const buf = this.buffers.get(`amb-${name}`);
      if (!buf) continue;
      const g = ac.createGain();
      g.gain.value = 0;
      g.connect(this.natureBus);
      this.zoneGain.set(name, g);
      this.loopWithCrossfade(buf, g);
    }
  }

  /** Overlapping copies of one buffer with equal-power crossfades, so the loop never clicks or pumps. */
  private loopWithCrossfade(buf: AudioBuffer, dest: AudioNode): void {
    const ac = this.ac;
    if (!ac) return;
    const period = buf.duration - CROSSFADE_S;
    const n = 64;
    const up = new Float32Array(n);
    const down = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      up[i] = Math.sin((t * Math.PI) / 2);
      down[i] = Math.cos((t * Math.PI) / 2);
    }
    const spawn = (t0: number, first: boolean) => {
      const s = ac.createBufferSource();
      s.buffer = buf;
      const g = ac.createGain();
      s.connect(g).connect(dest);
      if (first) g.gain.setValueAtTime(1, t0);
      else g.gain.setValueCurveAtTime(up, t0, CROSSFADE_S);
      g.gain.setValueAtTime(1, t0 + (first ? 0 : CROSSFADE_S));
      g.gain.setValueCurveAtTime(down, t0 + buf.duration - CROSSFADE_S, CROSSFADE_S);
      s.start(t0);
      s.stop(t0 + buf.duration + 0.1);
    };
    let next = ac.currentTime + 0.05;
    spawn(next, true);
    const timer = setInterval(() => {
      if (!this.ac) return;
      while (next + period < this.ac.currentTime + 6) {
        next += period;
        spawn(next, false);
      }
    }, 1500);
    this.timers.add(timer);
  }

  private play(name: string, { gain = 1, rate = 1, pan = 0, bus }: { gain?: number; rate?: number; pan?: number; bus: GainNode | null }): void {
    const ac = this.ac;
    const buf = this.buffers.get(name);
    if (!ac || !buf || !bus || this.muted) return;
    const s = ac.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    const g = ac.createGain();
    g.gain.value = gain;
    let node: AudioNode = s.connect(g);
    if (ac.createStereoPanner) {
      const p = ac.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      node = node.connect(p);
    }
    node.connect(bus);
    s.start();
  }
}
