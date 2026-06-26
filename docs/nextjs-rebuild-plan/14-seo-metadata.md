# 14 — SEO & Metadata

The current SPA ships no SSR and no per-page metadata — invisible to crawlers and social unfurlers. Next.js makes this nearly free for the pages that benefit. This also folds in brief §15 (Accessibility is in [15](./15-performance.md)).

---

## 1. Which pages need what

| Page | Indexable | Metadata | OG/Twitter | Dynamic | Notes |
|---|---|---|---|---|---|
| **Landing `/`** | ✅ Yes | Full | ✅ Rich | Static | The page SEO actually matters for; product pitch |
| Login / Signup | ✅ (thin) | Title + description | Basic | Static | `noindex` optional; little value but harmless |
| **Dashboard** | ❌ No | Title only | — | per-user | `robots: { index: false }` — private |
| Analytics | ❌ No | Title only | — | per-user | private |
| Interviews list | ❌ No | Title only | — | per-user | private |
| **Replay `/interviews/[id]`** | ❌ No | `generateMetadata` (title shows role/date) | — | per-user | Private, but nice tab titles |
| Setup / Roles / Profile | ❌ No | Title only | — | per-user | private |
| Interview (voice/technical) | ❌ No | Title only | — | per-user | private |

**Key point:** only **public** pages (landing, auth) get indexed and richly tagged. Everything behind auth gets a clean `<title>` and `noindex`. Don't waste OG effort on private routes.

---

## 2. Metadata implementation

### Root defaults — `app/layout.tsx`
```ts
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: "ACE.AI — Voice Engineering Interview Practice", template: "%s · ACE.AI" },
  description: "Practice realistic AI-powered voice engineering interviews. Behavioral and technical, with instant scoring.",
  openGraph: { type: "website", siteName: "ACE.AI", images: ["/og.png"] },
  twitter: { card: "summary_large_image" },
};
```
The `template` gives every child page a consistent `"<Page> · ACE.AI"` title via just its own `title`.

### Landing — `app/(marketing)/page.tsx`
Full OG image, descriptive copy, canonical URL. This is the highest-value metadata in the app.

### Private pages
```ts
// app/(app)/layout.tsx or per page
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};
```

### Dynamic title — `app/(app)/interviews/[id]/page.tsx`
```ts
export async function generateMetadata({ params }): Promise<Metadata> {
  const interview = await getInterviewById(user.id, params.id);
  return { title: interview ? `${cap(interview.role)} ${interview.question_type} — Replay` : "Interview", robots: { index: false } };
}
```
Gives meaningful browser-tab/history titles without exposing private data publicly.

---

## 3. Structured data (landing only)

Add `SoftwareApplication` / `Product` JSON-LD on the landing page to help search understand the product:
```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
  "@context": "https://schema.org", "@type": "SoftwareApplication",
  name: "ACE.AI", applicationCategory: "EducationApplication", offers: { "@type": "Offer", price: "0" }
})}} />
```
Only on public pages; never embed private/user data in structured data.

---

## 4. Sitemap & robots

### `app/sitemap.ts`
Include **only public** URLs (landing, login, signup). Do **not** enumerate private/per-user routes.
```ts
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "monthly", priority: 1 },
    { url: `${siteConfig.url}/login`, priority: 0.3 },
    { url: `${siteConfig.url}/signup`, priority: 0.3 },
  ];
}
```

### `app/robots.ts`
```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/analytics", "/interviews", "/setup", "/profile", "/interview", "/technical-interview", "/api"] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
```

---

## 5. Canonical URLs

- Landing: self-canonical.
- Private pages: not indexed, canonical irrelevant.
- Avoid duplicate-content issues by **not** carrying the old `/replay` (router-state) route — `/interviews/[id]` is the single canonical replay URL.

---

## 6. Favicon, icons, manifest

- `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` via the file conventions.
- Optional `app/manifest.ts` for installability (the app is interview-practice; PWA is a nice-to-have, P2).

---

## 7. OG image

- One static `/og.png` for the brand/landing is enough for MVP.
- Dynamic OG (`opengraph-image.tsx` via `ImageResponse`) is **not** needed — there's no public shareable per-item content (interviews are private). Skip it.

---

## 8. Summary

The SEO story is small and focused: **make the landing page a great static, fully-tagged, crawlable Server Component**, give auth pages basic tags, and `noindex` everything private with clean titles. This is a large UX/marketing win that the current SPA cannot deliver at all.
