import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

// Branded 1200×630 social share card, generated at build/request time so it can
// never drift out of sync with the site name/tagline (the previous static
// `/og.png` reference pointed at a file that didn't exist).
export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #1e3a8a 0%, #4338ca 50%, #6d28d9 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", opacity: 0.9 }}>
          {siteConfig.name}
        </div>
        <div
          style={{
            fontSize: 78,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            marginTop: 24,
            maxWidth: 900,
          }}
        >
          Voice engineering interview practice
        </div>
        <div style={{ fontSize: 34, marginTop: 28, opacity: 0.85, maxWidth: 880 }}>
          {siteConfig.description}
        </div>
      </div>
    ),
    { ...size },
  );
}
