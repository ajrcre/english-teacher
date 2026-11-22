/** Student avatars (art in /public/art/avatars/<id>.webp). */
export const AVATARS = ["fox", "owl", "whale", "deer", "otter", "heron", "bear", "lynx"] as const;
export type Avatar = (typeof AVATARS)[number];
