"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { fitBox, type Box } from "@/lib/game/stage";

/**
 * Sizes a mini-game's pixel field to the space it is given (the element behind `areaRef`).
 * The field's layout (its logical height) is picked once, when the question starts, so the game
 * never restarts mid-question; later size changes (a browser bar sliding away, a feedback sheet)
 * only rescale it.
 */
export function useField<T extends { h: number }>(width: number, pick: (area: Box) => T) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [field, setField] = useState<T | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const pickRef = useRef(pick);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = (): Box => {
      const area = { w: el.clientWidth, h: el.clientHeight };
      // No height to fill (an unusual layout): use the field's natural shape instead.
      return area.h < 80 ? { w: area.w, h: area.w } : area;
    };
    const f = pickRef.current(measure());
    setField(f);
    setBox(fitBox(measure(), width, f.h));
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBox(fitBox(measure(), width, f.h)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  return { areaRef, field, box };
}
