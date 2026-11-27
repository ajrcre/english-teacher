import { AVATARS } from "@/lib/avatars";
import { FRAME_IDS, HAT_ITEM_IDS, rollChest, SHOP_AVATAR_IDS, SHOP_BY_ID, SHOP_ITEMS, STICKERS, type ChestContents } from "@/lib/gamification/collection";
import { XP_RULES } from "@/lib/gamification/engine";
import type { Repositories } from "@/lib/db/repositories";
import { logger } from "@/lib/logger";

export class RewardError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Rolls a chest and stores any sticker. The caller adds `contents.stars` to the student's stats. */
export async function grantChest(repos: Repositories, studentId: string, tier: "wood" | "boss", random: () => number, unitId?: string): Promise<ChestContents> {
  const owned = new Set((await repos.rewards.inventory(studentId)).filter((i) => i.kind === "sticker").map((i) => i.itemId));
  const contents = rollChest(tier, owned, random, unitId);
  if (contents.sticker) await repos.rewards.addItem(studentId, contents.sticker, "sticker");
  return contents;
}

export interface ShopView {
  balance: number;
  shields: number;
  maxShields: number;
  items: { id: string; kind: string; title: string; description: string; price: number; earnedBy?: string; owned: boolean; equipped: boolean; soldOut: boolean }[];
}

/** The star shop, the sticker album and equipping what was bought. */
export class RewardsService {
  constructor(private readonly repos: Repositories) {}

  async shop(studentId: string): Promise<ShopView> {
    const [stats, inv, student] = await Promise.all([this.repos.progress.getStats(studentId), this.repos.rewards.inventory(studentId), this.repos.users.findStudent(studentId)]);
    const owned = new Set(inv.map((i) => i.itemId));
    return {
      balance: stats.stars - stats.starsSpent,
      shields: stats.shields,
      maxShields: XP_RULES.maxShields,
      items: SHOP_ITEMS.map((i) => ({
        ...i,
        owned: owned.has(i.id),
        equipped: i.id === student?.avatar || i.id === student?.frame || i.id === student?.hat,
        soldOut: i.kind === "shield" && stats.shields >= XP_RULES.maxShields,
      })),
    };
  }

  async buy(studentId: string, itemId: string): Promise<ShopView> {
    const item = SHOP_BY_ID.get(itemId);
    if (!item) throw new RewardError(404, "That item isn't in the shop");
    if (item.earnedBy) throw new RewardError(409, `${item.earnedBy}: it can't be bought`);
    if (item.kind === "shield") {
      const stats = await this.repos.progress.getStats(studentId);
      if (stats.shields >= XP_RULES.maxShields) throw new RewardError(409, "You already have the most shields you can carry");
      if (!(await this.repos.rewards.spendStars(studentId, item.price))) throw new RewardError(402, "Not enough stars yet");
      if (!(await this.repos.rewards.addShield(studentId, XP_RULES.maxShields))) {
        await this.repos.rewards.refundStars(studentId, item.price);
        throw new RewardError(409, "You already have the most shields you can carry");
      }
    } else {
      const inv = await this.repos.rewards.inventory(studentId);
      if (inv.some((i) => i.itemId === itemId)) throw new RewardError(409, "You already own this");
      if (!(await this.repos.rewards.spendStars(studentId, item.price))) throw new RewardError(402, "Not enough stars yet");
      await this.repos.rewards.addItem(studentId, itemId, item.kind);
      // Wear it straight away: that's what you bought it for.
      await this.repos.users.updateStudent(studentId, item.kind === "avatar" ? { avatar: itemId } : item.kind === "hat" ? { hat: itemId } : { frame: itemId });
    }
    logger.info("shop purchase", { studentId, itemId, price: item.price });
    return this.shop(studentId);
  }

  /** Checks the student may use an avatar, frame or hat (built-in avatars are free; shop ones must be owned). */
  async canUse(studentId: string, patch: { avatar?: string; frame?: string | null; hat?: string | null }): Promise<boolean> {
    const needs: string[] = [];
    if (patch.avatar && !(AVATARS as readonly string[]).includes(patch.avatar)) {
      if (!SHOP_AVATAR_IDS.includes(patch.avatar)) return false;
      needs.push(patch.avatar);
    }
    if (patch.frame) {
      if (!FRAME_IDS.includes(patch.frame)) return false;
      needs.push(patch.frame);
    }
    if (patch.hat) {
      if (!HAT_ITEM_IDS.includes(patch.hat)) return false;
      needs.push(patch.hat);
    }
    if (!needs.length) return true;
    const owned = new Set((await this.repos.rewards.inventory(studentId)).map((i) => i.itemId));
    return needs.every((n) => owned.has(n));
  }

  async owned(studentId: string): Promise<{ avatars: string[]; frames: string[]; hats: string[] }> {
    const inv = await this.repos.rewards.inventory(studentId);
    const of = (kind: string) => inv.filter((i) => i.kind === kind).map((i) => i.itemId);
    return { avatars: of("avatar"), frames: of("frame"), hats: of("hat") };
  }

  async album(studentId: string) {
    const inv = await this.repos.rewards.inventory(studentId);
    const counts = new Map(inv.filter((i) => i.kind === "sticker").map((i) => [i.itemId, i.count]));
    const stickers = STICKERS.map((s) => ({ ...s, count: counts.get(s.id) ?? 0 }));
    return { stickers, collected: stickers.filter((s) => s.count > 0).length, total: stickers.length };
  }
}
