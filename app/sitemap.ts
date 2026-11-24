import type { MetadataRoute } from "next";
import { PUBLIC_PAGES, siteUrl } from "@/lib/site";

/** /sitemap.xml: the pages anyone can open. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_PAGES.map((path) => ({
    url: new URL(path, base).href,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
