import type { UnitInput } from "@/lib/content/schema";
import { grammar } from "./grammar";
import { numberTheStars } from "./numberTheStars";
import { poetry } from "./poetry";
import { shortStories } from "./shortStories";
import { spelling } from "./spelling";
import { theGiver } from "./theGiver";
import { wordTreasury } from "./wordTreasury";

/** Order here is the order units appear on the map. */
export const units: UnitInput[] = [numberTheStars, theGiver, shortStories, poetry, grammar, spelling, wordTreasury];
