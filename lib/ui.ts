/** Presentation helpers shared by server and client components. */
export const ACCENTS: Record<string, { hex: string; soft: string }> = {
  amber: { hex: "#f2a93b", soft: "rgb(242 169 59 / 0.16)" },
  teal: { hex: "#3fb3a8", soft: "rgb(63 179 168 / 0.16)" },
  rose: { hex: "#e0707a", soft: "rgb(224 112 122 / 0.16)" },
  sky: { hex: "#5fa8e0", soft: "rgb(95 168 224 / 0.16)" },
  lime: { hex: "#8dbf4c", soft: "rgb(141 191 76 / 0.16)" },
  violet: { hex: "#9c8bd8", soft: "rgb(156 139 216 / 0.16)" },
  sand: { hex: "#c9a77a", soft: "rgb(201 167 122 / 0.16)" },
};

export const unitArt = (unitId: string) => `/art/units/${unitId}.webp`;
export const avatarArt = (avatar: string) => `/art/avatars/${avatar}.webp`;
export const badgeArt = (icon: string) => `/art/badges/${icon}.webp`;
export const mascotArt = (pose: "idle" | "cheer" | "think" | "encourage" | "celebrate" | "sleepy") => `/art/mascot/${pose}.webp`;

export function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
