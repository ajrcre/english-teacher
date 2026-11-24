import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/** /robots.txt: crawlers may read the public pages; signed-in pages and the API are off limits. */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/join", "/parent/login", "/parent/signup"],
      disallow: ["/api/", "/home", "/practice", "/profile", "/unit/", "/parent"],
    },
    sitemap: new URL("/sitemap.xml", base).href,
    host: base.origin,
  };
}
