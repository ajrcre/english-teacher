/**
 * The warm, limited palette for all pixel art. One character per colour so sprites can be
 * written as rows of text; "." is always transparent.
 *
 * Character colours are deliberately muted (soft, slightly dusty) so creatures sit calmly
 * in front of the richer scenery. Digits 0–9 and a few spare letters are scenery shades:
 * sky gradients, haze and distance colours used mainly by the battle backdrops.
 */
export const PALETTE: Record<string, string> = {
  // outlines and night
  k: "#241c2b", // warm near-black outline
  n: "#0d1a2b", // ink navy
  N: "#1d3250", // midnight blue
  b: "#2f4866", // dusk blue
  B: "#6f97ba", // muted sky blue
  c: "#aac6d6", // soft ice blue
  // creams and whites
  w: "#ece4d6", // paper white (muted)
  W: "#ddd1bd", // cream
  e: "#bfb29d", // cream shadow
  g: "#8f877c", // warm grey
  G: "#5a5560", // dark grey
  // warm lights
  y: "#ead39b", // pale gold
  Y: "#dcbb86", // soft amber
  a: "#cf9c55", // amber
  A: "#9c703f", // deep amber
  o: "#c47e55", // fox orange (dusty)
  O: "#8c5a42", // rust
  // browns
  t: "#a98667", // tan wood
  T: "#7a5a43", // wood
  d: "#4f3a2e", // dark wood
  // reds and pinks
  r: "#b05a5c", // red (muted)
  R: "#733942", // dark red
  p: "#cf9f9b", // dusty pink
  // greens
  l: "#a2b47f", // sage leaf
  L: "#6b8758", // green
  h: "#3e5741", // dark green
  // teals and purples
  s: "#9cc2b9", // teal light
  S: "#5f9890", // teal
  v: "#a99cc4", // lilac
  V: "#776a9c", // purple
  u: "#4b416b", // deep purple
  m: "#2d2744", // shadow purple
  "*": "#e0463c", // glowing red (the Grey Fox's eyes: the one bright red, so they stand out)

  // ---- scenery shades (backdrops) ----
  "0": "#0b1424", // deepest night
  "1": "#122039", // night
  "2": "#1a2d4c", // upper dusk
  "3": "#26405f", // dusk
  "4": "#3a5675", // low sky
  "5": "#56708c", // haze blue
  "6": "#7d8fa6", // far haze
  "7": "#e9a76f", // sunset peach
  "8": "#d9846a", // sunset coral
  "9": "#a86a7a", // sunset mauve
  f: "#f6e7b8", // moonlight / warm window glow
  i: "#33405a", // far hills
  j: "#25314a", // near hills
  q: "#141b2c", // silhouettes
  x: "#e8eef2", // fresh snow
  z: "#c3d1dc", // snow shadow
  C: "#93aec2", // ice
  D: "#6c8aa3", // deep ice
  E: "#3b2a33", // cave dark
  F: "#55404a", // cave rock
  H: "#735a5c", // cave rock light
  I: "#8e6b4f", // workshop wall
  J: "#6b4f3c", // workshop wall dark
  K: "#b48a5a", // lamplight wood
  M: "#5d7a4c", // meadow
  P: "#7f9a5e", // meadow light
  Q: "#43603f", // meadow dark
  U: "#8d3f45", // curtain red
  X: "#5e2a33", // curtain shadow
  Z: "#c77a6a", // curtain light
  // the Grey Fox's castle: purple night, black and grey stone, violet glows
  "(": "#120d1c", // night black
  ")": "#1e1630", // darkest purple
  "[": "#2c2142", // dark purple stone
  "]": "#3f3259", // purple stone
  "{": "#574776", // light purple stone
  "}": "#7a6a98", // stone highlight
  "<": "#34303c", // dark grey stone
  ">": "#4d4857", // grey stone
  "~": "#4a2550", // plum sky
  "^": "#6b3566", // cloud plum
  "=": "#8c4f7c", // cloud light
  "@": "#a06ad0", // violet glow (windows, magic torch flames)
};

export const TRANSPARENT = ".";
