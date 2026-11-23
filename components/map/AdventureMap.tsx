"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import "./adventure-map.css";
import { make, pct, place, ART } from "./dom";
import { AmbientEffects } from "./effects";
import { MAP_H, MAP_W, PLACES, PLACE_ORDER, surfaceAt, zoneGains, type Surface } from "./layout";
import { Nova } from "./nova";
import { MapSoundscape } from "./soundscape";

export interface MapPlace {
  id: string;
  name: string;
  tagline: string;
  /** Lessons completely mastered (stars lit). */
  lit: number;
  /** Lessons in the unit. */
  total: number;
  /** 0..1 share of the unit's questions mastered; drives the ring around the pin. */
  mastery: number;
}

const SOUND_KEY = "starlight.mapSound";
const LAST_PLACE_KEY = "starlight.mapPlace";
const TAG_W = 236;
const RING = 144.5;

const DUST_COLOR: Record<Surface, string> = { dirt: "rgb(190 158 112 / 0.85)", grass: "rgb(150 185 90 / 0.7)", snow: "rgb(255 255 255 / 0.95)", wood: "rgb(170 130 90 / 0.5)" };

/** A pin focused with the keyboard keeps its spotlight even if the page scrolls under a resting mouse. */
const keyboardFocusOnPin = () => !!document.activeElement?.matches(".am-pin:focus-visible");

const subscribePref = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
function readPref(): "on" | "off" | null {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

/** The units as places on one hand-drawn map. Hover or tap a place to light it up; tap to send Nova there. */
export function AdventureMap({ places, startId, soundOn }: { places: MapPlace[]; startId: string; soundOn: boolean }) {
  const mapped = useMemo(() => PLACE_ORDER.map((id) => places.find((p) => p.id === id)).filter((p): p is MapPlace => !!p), [places]);
  const byId = useMemo(() => new Map(mapped.map((p) => [p.id, p])), [mapped]);

  const stageRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const ripplesRef = useRef<SVGGElement>(null);
  const snowRef = useRef<HTMLCanvasElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const novaRef = useRef<Nova | null>(null);
  const soundRef = useRef<MapSoundscape | null>(null);
  const effectsRef = useRef<AmbientEffects | null>(null);

  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  // The student's saved choice on this device wins over their profile setting.
  const pref = useSyncExternalStore(subscribePref, readPref, () => null);
  const [override, setOverride] = useState<boolean | null>(null);
  const muted = override ?? (pref ? pref === "off" : !soundOn);
  const mutedRef = useRef(muted);
  const active = hovered ?? selected;
  const place_ = active ? PLACES[active] : null;

  useEffect(() => {
    mutedRef.current = muted;
    soundRef.current?.setMuted(muted);
  }, [muted]);

  const unlockSound = useCallback(() => {
    if (!mutedRef.current) void soundRef.current?.unlock();
  }, []);

  // ---- the living scene: Nova, effects, sounds and the animation loop ----
  useEffect(() => {
    const stage = stageRef.current;
    const back = backRef.current;
    const front = frontRef.current;
    const ripples = ripplesRef.current;
    const snow = snowRef.current;
    if (!stage || !back || !front || !ripples || !snow) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // What is under her feet: the artwork is sampled at low resolution to find the snowy ground.
    let probe: Uint8ClampedArray | null = null;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = 175;
      c.height = 314;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 175, 314);
      probe = ctx.getImageData(0, 0, 175, 314).data;
    };
    img.src = `${ART}/map.webp`;
    const isSnowAt = (x: number, y: number) => {
      if (!probe) return false;
      const i = (Math.min(313, Math.floor(y / 4)) * 175 + Math.min(174, Math.floor(x / 4))) * 4;
      return probe[i] > 190 && probe[i + 1] > 200 && probe[i + 2] > 200 && probe[i + 2] >= probe[i] - 10;
    };
    const surface = (x: number, y: number) => surfaceAt(x, y, isSnowAt);

    const sound = new MapSoundscape();
    soundRef.current = sound;
    sound.setMuted(mutedRef.current);

    const dust = (x: number, y: number, surf: Surface) => {
      if (reduced || front.querySelectorAll(".am-dust").length > 12) return;
      const k = stage.clientWidth / MAP_W;
      for (let n = 0; n < 2; n++) {
        const d = make("div", "am-dust", front);
        place(d, x + (Math.random() - 0.5) * 14, y - 2);
        d.style.width = pct((surf === "snow" ? 9 : 7) + Math.random() * 4, MAP_W);
        d.style.aspectRatio = "1";
        d.style.background = `radial-gradient(circle, ${DUST_COLOR[surf]}, transparent 70%)`;
        d.style.setProperty("--dx", `${(Math.random() - 0.5) * 16 * k}px`);
        d.style.setProperty("--rise", `${(8 + Math.random() * 10) * k}px`);
        setTimeout(() => d.remove(), 760);
      }
    };

    // She waits where the student last was (e.g. coming back from a lesson), else at their current focus.
    let start = startId;
    try {
      const saved = sessionStorage.getItem(LAST_PLACE_KEY);
      if (saved && PLACES[saved]) start = saved;
    } catch {
      /* private mode */
    }
    const nova = new Nova(
      stage,
      start,
      {
        surfaceAt: surface,
        onStep: (surf, strength, pan) => sound.step(surf, strength, pan),
        onDust: dust,
        follow: (el) => {
          const r = el.getBoundingClientRect();
          if (r.top < 90 || r.bottom > window.innerHeight - 90) window.scrollBy({ top: (r.top + r.bottom) / 2 - window.innerHeight / 2, behavior: "auto" });
        },
      },
      reduced,
    );
    novaRef.current = nova;
    const effects = new AmbientEffects({ stage, back, front, ripples, snow });
    effects.onBird = () => sound.bird();
    effectsRef.current = effects;
    sound.scheduleBirds(() => zoneGains(nova.x, nova.y));

    const resize = () => {
      stage.style.setProperty("--px", `${stage.clientWidth / MAP_W}px`);
      effects.resize();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    let raf = 0;
    let last = performance.now();
    let mixAt = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      nova.update(dt, now, now / 1000);
      effects.update(dt, now / 1000, now);
      if (now > mixAt) {
        mixAt = now + 150;
        sound.setZones(zoneGains(nova.x, nova.y));
      }
      raf = requestAnimationFrame(tick);
    };
    if (!reduced) raf = requestAnimationFrame(tick);

    const wake = () => nova.wake();
    const onVisibility = () => sound.setVisible(!document.hidden);
    window.addEventListener("keydown", wake);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", wake);
      document.removeEventListener("visibilitychange", onVisibility);
      sound.dispose();
      effects.dispose();
      nova.root.remove();
      novaRef.current = null;
      soundRef.current = null;
      effectsRef.current = null;
    };
  }, [startId]);

  // Finished places sparkle.
  useEffect(() => {
    effectsRef.current?.setFinished(mapped.filter((p) => p.total > 0 && p.lit >= p.total).map((p) => PLACES[p.id].pin));
  }, [mapped]);

  // The label card sits just outside the highlighted place, so it never covers what it describes.
  useLayoutEffect(() => {
    const tag = tagRef.current;
    const stage = stageRef.current;
    if (!tag || !stage || !active) return;
    const layout = () => {
      const l = PLACES[active];
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const k = W / MAP_W;
      const w = Math.min(TAG_W, W - 16);
      const h = tag.offsetHeight || 130;
      const cy = l.c[1] * k;
      const ry = l.r[1] * k;
      const below = cy + ry + 8;
      const fitsBelow = below + h <= H - 6;
      tag.style.left = `${Math.min(Math.max(8, l.c[0] * k - w / 2), W - w - 8)}px`;
      tag.style.top = `${fitsBelow ? below : Math.max(6, cy - ry - h - 8)}px`;
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(stage);
    return () => ro.disconnect();
  }, [active, selected]);

  // ---- interaction ----
  const pick = (e: React.PointerEvent | React.MouseEvent): string | null => {
    const stage = stageRef.current;
    if (!stage) return null;
    const r = stage.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * MAP_W;
    const my = ((e.clientY - r.top) / r.height) * MAP_H;
    let best: string | null = null;
    let bd = 1;
    for (const p of mapped) {
      const l = PLACES[p.id];
      const d = ((mx - l.c[0]) / l.r[0]) ** 2 + ((my - l.c[1]) / l.r[1]) ** 2;
      if (d < bd) {
        bd = d;
        best = p.id;
      }
    }
    return best;
  };

  /**
   * True while the mouse is on the open card of the chosen place, or just around it on the way
   * there. The card often sits over a neighbouring place (Short Stories' card covers the harbour),
   * so hovering that neighbour must not swap the card away before its button can be clicked.
   */
  const nearChosenCard = (e: React.PointerEvent): boolean => {
    const tag = tagRef.current;
    if (!tag || !selected || active !== selected) return false;
    const r = tag.getBoundingClientRect();
    const m = 24;
    return e.clientX >= r.left - m && e.clientX <= r.right + m && e.clientY >= r.top - m && e.clientY <= r.bottom + m;
  };

  const choose = (id: string) => {
    setSelected(id);
    novaRef.current?.walkTo(id);
    try {
      sessionStorage.setItem(LAST_PLACE_KEY, id);
    } catch {
      /* private mode */
    }
    unlockSound();
  };

  const toggleSound = () => {
    const next = !muted;
    setOverride(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "off" : "on");
    } catch {
      /* private mode */
    }
    if (!next) {
      mutedRef.current = false;
      void soundRef.current?.unlock();
    }
  };

  const spot = active && place_ ? ({ "--sx": pct(place_.c[0], MAP_W), "--sy": pct(place_.c[1], MAP_H), "--rx": pct(place_.r[0] * 1.18, MAP_W), "--ry": pct(place_.r[1] * 1.18, MAP_H) } as CSSProperties) : undefined;
  const activePlace = active ? byId.get(active) : undefined;
  const canHover = typeof window !== "undefined" && window.matchMedia?.("(hover: hover)").matches;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-300">Pick a place and Nova walks you there.</p>
        <button type="button" className="am-sound" aria-pressed={!muted} onClick={toggleSound}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 9v6h4l5 4V5L8 9H4Z" />
            {muted ? <path d="m17 9 5 6m0-6-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
          </svg>
          <span className="whitespace-nowrap">Sounds {muted ? "off" : "on"}</span>
        </button>
      </div>

      <div
        ref={stageRef}
        className={`am-stage ${active ? "am-spot" : ""} ${active ? "am-hover" : ""}`}
        style={spot}
        onPointerDown={unlockSound}
        onPointerMove={(e) => {
          novaRef.current?.wake();
          if (e.pointerType !== "mouse") return;
          if (nearChosenCard(e)) return;
          const id = pick(e);
          // A synthetic mouse move (e.g. the page scrolling under a resting cursor) must not undo keyboard focus.
          if (!id && keyboardFocusOnPin()) return;
          if (id !== hovered) setHovered(id);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && !keyboardFocusOnPin()) setHovered(null);
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest(".am-tag, .am-pin")) return;
          const id = pick(e);
          if (id) choose(id);
          else setSelected(null);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="am-map" src={`${ART}/map.webp`} alt="Hand-drawn map with seven places: a fishing village, a town of grey houses, a storybook cottage, a snowy forest, an inventor's tower, a beehive tree and a treasure cave." draggable={false} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="am-map am-lift" src={`${ART}/map.webp`} alt="" draggable={false} />
        <div className="am-dim" />
        <div ref={backRef} className="am-layer" />
        <canvas ref={snowRef} className="am-snow" />
        <svg className="am-over" viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden="true">
          <g ref={ripplesRef} />
        </svg>
        <div ref={frontRef} className="am-layer" />

        <div className="am-pins">
          {mapped.map((p) => {
            const l = PLACES[p.id];
            const done = p.total > 0 && p.lit >= p.total;
            return (
              <button
                key={p.id}
                type="button"
                className={`am-pin ${done ? "am-done" : ""} ${active === p.id ? "am-on" : ""}`}
                style={{ left: pct(l.pin[0], MAP_W), top: pct(l.pin[1], MAP_H) }}
                aria-label={`${p.name}: ${p.lit} of ${p.total} stars lit`}
                aria-pressed={selected === p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  choose(p.id);
                }}
                onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(p.id)}
                onPointerLeave={(e) => e.pointerType === "mouse" && !keyboardFocusOnPin() && setHovered(null)}
                onFocus={() => setHovered(p.id)}
                onBlur={() => setHovered(null)}
              >
                <svg viewBox="0 0 50 50" aria-hidden="true">
                  <circle className="am-disc" cx="25" cy="25" r="19" />
                  <circle className="am-track" cx="25" cy="25" r="23" fill="none" strokeWidth="4" />
                  <circle className="am-prog" cx="25" cy="25" r="23" fill="none" strokeWidth="4" strokeLinecap="round" transform="rotate(-90 25 25)" strokeDasharray={RING} strokeDashoffset={(RING * (1 - Math.min(1, p.mastery))).toFixed(1)} />
                  <text className="am-num" x="25" y="26">
                    {PLACE_ORDER.indexOf(p.id) + 1}
                  </text>
                </svg>
              </button>
            );
          })}
        </div>

        <div ref={tagRef} className={`am-tag ${activePlace ? "am-show" : ""} ${activePlace && selected === activePlace.id ? "am-act" : ""}`} role="status" aria-live="polite">
          {activePlace && (
            <>
              <h2>{activePlace.name}</h2>
              <p>{activePlace.tagline}</p>
              <div className="am-meter" aria-hidden="true">
                <i style={{ width: `${Math.round(activePlace.mastery * 100)}%` }} />
              </div>
              <div className="am-count">
                {activePlace.lit} of {activePlace.total} stars lit
              </div>
              {selected === activePlace.id ? (
                <Link href={`/unit/${activePlace.id}`} className="btn btn-primary am-open">
                  Open lessons
                </Link>
              ) : (
                <div className="am-hint">{canHover ? "Click" : "Tap"} to send Nova here</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* The same places as plain links, for keyboards and screen readers. */}
      <ul className="sr-only">
        {mapped.map((p) => (
          <li key={p.id}>
            <Link href={`/unit/${p.id}`}>
              {p.name}: {p.lit} of {p.total} stars lit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
