export const config = {
  title: "URL Shortener API Explorer",
  defaultExampleId: "list-links",
};

export const apiExamples = [
  { id: "list-links", label: "List links", method: "GET", path: "/links" },
  { id: "link-detail", label: "Link detail", method: "GET", path: "/links/docs" },
  {
    id: "create-link",
    label: "Create generated link",
    method: "POST",
    path: "/links",
    body: { original_url: "https://example.com/dashboard", title: "Dashboard" },
  },
  {
    id: "create-alias",
    label: "Create custom alias",
    method: "POST",
    path: "/links",
    body: {
      original_url: "https://example.com/pricing",
      custom_alias: "pricing",
      title: "Pricing",
      expires_at: "2099-02-10T09:00:00.000Z",
    },
  },
  { id: "redirect", label: "Redirect", method: "GET", path: "/r/docs" },
  {
    id: "update-link",
    label: "Update link",
    method: "PATCH",
    path: "/links/docs",
    body: { title: "Documentation", is_active: true, expires_at: null },
  },
  { id: "analytics", label: "Analytics", method: "GET", path: "/links/docs/analytics" },
];
