import { MAP_H, MAP_W } from "./layout";

export const ART = "/art/map";

/** Percent of the map, so an element stays pinned to its spot at every size. */
export const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

export function place(el: HTMLElement | SVGElement, x: number, y: number): void {
  el.style.left = pct(x, MAP_W);
  el.style.top = pct(y, MAP_H);
}

export function make<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string | null, parent: Element): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  parent.appendChild(e);
  return e;
}

/** An image anchored at its bottom centre on a map point, `w` map pixels wide. */
export function sprite(parent: Element, file: string, x: number, y: number, w: number, cls: string): HTMLImageElement {
  const i = make("img", cls, parent);
  i.src = `${ART}/${file}.webp`;
  i.alt = "";
  i.draggable = false;
  place(i, x, y);
  i.style.width = pct(w, MAP_W);
  i.style.transformOrigin = "50% 100%";
  i.style.transform = "translate(-50%, -100%)";
  return i;
}
