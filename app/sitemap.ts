import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Public URLs only — never enumerate private/per-user routes.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/features`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/how-it-works`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/interview-types`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/pricing`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteConfig.url}/login`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/signup`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
