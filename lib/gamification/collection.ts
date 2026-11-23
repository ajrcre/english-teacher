/**
 * Collectables: stickers for the album (won from treasure chests) and the shop catalogue
 * (spent with stars). Pure data, shared by server and client. Art lives in lib/pixel.
 */
export type Rarity = "common" | "rare" | "legendary";

export interface StickerDef {
  id: string;
  title: string;
  unitId: string;
  rarity: Rarity;
}

const s = (unitId: string, rarity: Rarity, id: string, title: string): StickerDef => ({ id, title, unitId, rarity });

export const STICKERS: StickerDef[] = [
  s("number-the-stars", "common", "fishing-boat", "Fishing Boat"),
  s("number-the-stars", "common", "secret-packet", "Secret Packet"),
  s("number-the-stars", "rare", "star-necklace", "Star Necklace"),
  s("the-giver", "common", "apple", "The Apple"),
  s("the-giver", "common", "memory-snowflake", "Memory Snowflake"),
  s("the-giver", "rare", "red-sled", "The Red Sled"),
  s("short-stories", "common", "pocket-watch", "Pocket Watch"),
  s("short-stories", "common", "red-sweater", "Red Sweater"),
  s("short-stories", "rare", "flying-saucer", "Flying Saucer"),
  s("poetry", "common", "signpost", "Two Roads"),
  s("poetry", "common", "sleigh-bell", "Harness Bell"),
  s("poetry", "rare", "quill", "Poet's Quill"),
  s("grammar", "common", "pencil", "Pencil"),
  s("grammar", "common", "magnifier", "Magnifier"),
  s("grammar", "rare", "gear", "Golden Gear"),
  s("spelling", "common", "honey-jar", "Honey Jar"),
  s("spelling", "common", "honeycomb", "Honeycomb"),
  s("spelling", "rare", "honeybee", "Busy Bee"),
  s("word-treasury", "common", "gold-coin", "Gold Coin"),
  s("word-treasury", "common", "treasure-map", "Treasure Map"),
  s("word-treasury", "rare", "gem", "Word Gem"),
  // Legendary: a tamed boss for every unit, only from a first boss victory.
  s("spelling", "legendary", "boss-spelling", "The Hush Queen"),
  s("grammar", "legendary", "boss-grammar", "The Cog Golem"),
  s("word-treasury", "legendary", "boss-word-treasury", "The Hoard Wyrm"),
  s("number-the-stars", "legendary", "boss-number-the-stars", "The Fog Serpent"),
  s("the-giver", "legendary", "boss-the-giver", "The Grey Hush"),
  s("poetry", "legendary", "boss-poetry", "The Frost Owl"),
  s("short-stories", "legendary", "boss-short-stories", "The Ink Mimic"),
];

export const STICKER_BY_ID = new Map(STICKERS.map((st) => [st.id, st]));

/** Stars given instead of a sticker the student already has. */
export const DUPLICATE_STARS: Record<Rarity, number> = { common: 3, rare: 6, legendary: 15 };

export type ShopKind = "avatar" | "frame" | "shield" | "hat";

export interface ShopItem {
  id: string;
  kind: ShopKind;
  title: string;
  description: string;
  price: number;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "hat-party", kind: "hat", title: "Party Hat", description: "Every round is a party.", price: 10 },
  { id: "hat-beanie", kind: "hat", title: "Cozy Beanie", description: "Warm ears for snowy lessons.", price: 25 },
  { id: "hat-flower", kind: "hat", title: "Flower Crown", description: "Picked in the beehive meadow.", price: 35 },
  { id: "hat-pirate", kind: "hat", title: "Pirate Hat", description: "Sail the word seas.", price: 60 },
  { id: "hat-wizard", kind: "hat", title: "Wizard Hat", description: "Grammar spells, cast correctly.", price: 90 },
  { id: "hat-crown", kind: "hat", title: "Golden Crown", description: "For the ruler of the sky.", price: 150 },
  { id: "shield", kind: "shield", title: "Streak Shield", description: "Saves your streak if you miss a day.", price: 30 },
  { id: "frame-bronze", kind: "frame", title: "Bronze Frame", description: "A warm bronze ring for your avatar.", price: 20 },
  { id: "frame-silver", kind: "frame", title: "Silver Frame", description: "A cool silver ring for your avatar.", price: 40 },
  { id: "frame-gold", kind: "frame", title: "Gold Frame", description: "A shining gold ring for your avatar.", price: 70 },
  { id: "frame-stars", kind: "frame", title: "Constellation Frame", description: "Your avatar among the stars.", price: 120 },
  { id: "px-cat", kind: "avatar", title: "Pixel Cat", description: "A grey tabby with green eyes.", price: 45 },
  { id: "px-panda", kind: "avatar", title: "Pixel Panda", description: "Sleepy, round and very calm.", price: 45 },
  { id: "px-phoenix", kind: "avatar", title: "Pixel Phoenix", description: "Rises again after every mistake.", price: 90 },
  { id: "px-dragon", kind: "avatar", title: "Pixel Dragon", description: "A friendly little word dragon.", price: 90 },
];

export const SHOP_BY_ID = new Map(SHOP_ITEMS.map((i) => [i.id, i]));
export const SHOP_AVATAR_IDS = SHOP_ITEMS.filter((i) => i.kind === "avatar").map((i) => i.id);
export const FRAME_IDS = SHOP_ITEMS.filter((i) => i.kind === "frame").map((i) => i.id);
export const HAT_ITEM_IDS = SHOP_ITEMS.filter((i) => i.kind === "hat").map((i) => i.id);

/** Rules for boss battles. */
export const BOSS_RULES = {
  /** Share of a lesson's questions the student must have seen before its boss appears. */
  unlockSeenShare: 0.5,
  minItems: 4,
  maxItems: 8,
  hearts: 3,
  /** Correct boss answers must be this recent to count toward a victory. */
  windowMinutes: 30,
  firstWinStars: 10,
  starsPerHeart: 5,
  repeatWinXp: 20,
};

export interface ChestContents {
  tier: "wood" | "boss";
  sticker: string | null;
  /** True when the sticker was a duplicate and turned into stars. */
  duplicate: boolean;
  stars: number;
}

/**
 * Rolls a chest. Pure (the random source is passed in) so it is easy to test.
 * Wood chest: 60% a sticker (1 in 5 of those rare), otherwise 3–10 stars.
 * Boss chest: the unit's legendary sticker if not yet owned, else a rare one, plus 10 stars.
 */
export function rollChest(tier: "wood" | "boss", owned: ReadonlySet<string>, random: () => number, unitId?: string): ChestContents {
  const pick = (list: StickerDef[]) => list[Math.floor(random() * list.length) % list.length];
  if (tier === "boss") {
    const legendary = STICKERS.find((st) => st.rarity === "legendary" && st.unitId === unitId);
    let sticker = legendary && !owned.has(legendary.id) ? legendary : null;
    if (!sticker) {
      const rares = STICKERS.filter((st) => st.rarity === "rare");
      sticker = rares.find((st) => st.unitId === unitId && !owned.has(st.id)) ?? pick(rares);
    }
    const duplicate = owned.has(sticker.id);
    return { tier, sticker: sticker.id, duplicate, stars: 10 + (duplicate ? DUPLICATE_STARS[sticker.rarity] : 0) };
  }
  if (random() < 0.6) {
    const rare = random() < 0.2;
    const pool = STICKERS.filter((st) => st.rarity === (rare ? "rare" : "common"));
    // Prefer stickers not owned yet, so the album fills up steadily.
    const fresh = pool.filter((st) => !owned.has(st.id));
    const sticker = pick(fresh.length && random() < 0.75 ? fresh : pool);
    const duplicate = owned.has(sticker.id);
    return { tier, sticker: sticker.id, duplicate, stars: duplicate ? DUPLICATE_STARS[sticker.rarity] : 0 };
  }
  return { tier, sticker: null, duplicate: false, stars: 3 + Math.floor(random() * 8) };
}
