import { units } from "@/content/units";
import { buildCatalog } from "@/lib/content/catalog";
const c = buildCatalog(units);
for (const u of c.units) console.log(u.id, u.lessons.length, "lessons", u.lessons.reduce((a, l) => a + l.items.length, 0), "items");
console.log("total", c.entries.length);
const byType: Record<string, number> = {};
for (const e of c.entries) byType[e.item.type] = (byType[e.item.type] ?? 0) + 1;
console.log(byType, "draft:", c.entries.filter((e) => e.item.reviewStatus === "draft").length);
