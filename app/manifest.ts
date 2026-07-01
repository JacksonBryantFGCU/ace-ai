import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// Web app manifest — enables "Add to Home Screen" and richer PWA-style metadata.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.title,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4338ca",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "192x192 512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
