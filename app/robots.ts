import type { MetadataRoute } from "next";

// Plan pages only render browser-local data, so there is nothing to index.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/plan", "/plan/summary"] } };
}
