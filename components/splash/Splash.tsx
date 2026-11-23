"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import "./splash.css";

export const SPLASH_KEY = "starlight.splash";
const ART = "/art/splash";

/** Runs while the HTML is parsed, before the first paint, so a returning visitor never sees the splash flash by. */
const GATE_SCRIPT = `try{var h=document.documentElement;if(/[?&]splash\\b/.test(location.search))localStorage.removeItem("${SPLASH_KEY}");h.dataset.splash=localStorage.getItem("${SPLASH_KEY}")==="1"?"seen":"new"}catch(e){document.documentElement.dataset.splash="new"}`;

// Pose height relative to the sitting pose (pixel heights of the artwork).
const POSES = { sit: 264, wave: 285, "look-up": 297, yawn: 245, sniff: 148, stretch: 232 } as const;
type PoseName = keyof typeof POSES;
const IDLE: readonly PoseName[] = ["wave", "look-up", "yawn", "stretch", "sniff"];

/** Deterministic pseudo-random numbers, so the server and the browser draw the same sky. */
function seeded(seed: number) {
  let s = seed;
  return (a: number, b: number) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return a + (s / 4294967296) * (b - a);
  };
}
const r1 = (n: number) => Math.round(n * 10) / 10;

const STARS = (() => {
  const rnd = seeded(7);
  return Array.from({ length: 16 }, (_, i) => ({ src: i % 2 ? "sparkle" : "sparkle-2", left: r1(rnd(4, 94)), top: r1(rnd(3, 36)), s: Math.round(rnd(11, 22)), d: r1(rnd(2.8, 5.5)), dl: r1(rnd(0, 4)) }));
})();
const FLIES = (() => {
  const rnd = seeded(21);
  return Array.from({ length: 18 }, () => ({ left: r1(rnd(4, 96)), top: r1(rnd(52, 94)), s: r1(rnd(4, 8)), x: Math.round(rnd(-50, 50)), y: Math.round(rnd(20, 60)), d: r1(rnd(9, 17)), dl: r1(rnd(0, 10)) }));
})();

type CssVars = React.CSSProperties & Record<`--${string}`, string | number>;

/**
 * The first-visit splash: twilight scene, Nova idling, and two painted buttons. It is rendered on `/`
 * for everyone (hidden by CSS for returning visitors) and covers the sign-in page until a button is pressed.
 */
export function Splash() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pose, setPose] = useState<PoseName>("sit");
  const pressed = useRef(false);

  // Soft navigations skip the inline script, so sync the gate attribute here too.
  useLayoutEffect(() => {
    try {
      document.documentElement.dataset.splash = localStorage.getItem(SPLASH_KEY) === "1" ? "seen" : "new";
    } catch {
      /* private mode: the splash simply shows every time */
    }
    return () => {
      // Once the splash has been used, reveal the page behind it for later visits to this route.
      if (pressed.current) document.documentElement.dataset.splash = "seen";
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 2100);
    return () => clearTimeout(t);
  }, []);

  // Nova waves hello first, then idles: a different small behaviour every few seconds.
  useEffect(() => {
    if (!ready || leaving) return;
    let timer: ReturnType<typeof setTimeout>;
    let last: PoseName = "wave";
    const act = (p: PoseName) => {
      last = p;
      setPose(p);
      timer = setTimeout(() => {
        setPose("sit");
        const opts = IDLE.filter((o) => o !== last);
        timer = setTimeout(() => act(opts[Math.floor(Math.random() * opts.length)]), 3200 + Math.random() * 2000);
      }, 2300 + Math.random() * 900);
    };
    timer = setTimeout(() => act("wave"), 1600);
    return () => clearTimeout(timer);
  }, [ready, leaving]);

  const go = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    try {
      localStorage.setItem(SPLASH_KEY, "1");
    } catch {
      /* private mode */
    }
    pressed.current = true;
    setPose("wave");
    setLeaving(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => router.push(href), reduced ? 0 : 950);
  };

  return (
    <>
      <script type={typeof window === "undefined" ? "text/javascript" : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }} />
      <div className={`sp-root ${ready ? "sp-ready" : ""} ${leaving ? "sp-leaving" : ""}`}>
        <picture className="sp-bg">
          <source media="(min-aspect-ratio: 1/1)" srcSet={`${ART}/dusk-wide.webp`} />
          { }
          <img src={`${ART}/dusk-portrait.webp`} alt="" draggable={false} fetchPriority="high" />
        </picture>
        <div className="sp-veil" />
        <div className="sp-fx" aria-hidden="true">
          {STARS.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} className="sp-star" src={`${ART}/${s.src}.webp`} alt="" style={{ left: `${s.left}%`, top: `${s.top}%`, "--s": s.s, "--d": `${s.d}s`, "--dl": `${s.dl}s` } as CssVars} />
          ))}
          {FLIES.map((f, i) => (
            <div key={i} className="sp-fly" style={{ left: `${f.left}%`, top: `${f.top}%`, "--s": f.s, "--x": f.x, "--y": f.y, "--d": `${f.d}s`, "--dl": `-${f.dl}s` } as CssVars} />
          ))}
        </div>

        <header className="sp-head">
          <div className="sp-kicker">Year 7 English</div>
          <h1 className="sp-title">
            Starlight <span>English</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${ART}/sparkle.webp`} alt="" />
          </h1>
          <p className="sp-tag">One star at a time. Every word counts.</p>
        </header>

        <div className="sp-nova" aria-hidden="true">
          <div className="sp-pool" />
          <div className="sp-shadow" />
          <div className="sp-breathe">
            {(Object.keys(POSES) as PoseName[]).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p} className={`sp-pose ${pose === p ? "sp-on" : ""}`} src={`${ART}/pose-${p}.webp`} alt="" draggable={false} style={{ "--k": (POSES[p] / POSES.sit).toFixed(3) } as CssVars} />
            ))}
          </div>
        </div>

        <div className="sp-actions">
          <div className="sp-loading" aria-hidden={ready}>
            <i />
            <span>Nova is lighting her lantern…</span>
          </div>
          <a href="/join" className="btn btn-primary sp-go" onClick={(e) => go(e, "/join")} tabIndex={ready ? 0 : -1}>
            Start the adventure
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
          <a href="/parent/login" className="btn btn-paper sp-sec" onClick={(e) => go(e, "/parent/login")} tabIndex={ready ? 0 : -1}>
            I’m a parent
          </a>
        </div>
      </div>
    </>
  );
}
