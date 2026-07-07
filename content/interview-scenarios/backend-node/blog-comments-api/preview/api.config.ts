export const config = {
  title: "Blog Comments API Explorer",
  defaultExampleId: "list-comments",
};

export const apiExamples = [
  { id: "list-comments", label: "List comments", method: "GET", path: "/posts/1/comments" },
  { id: "paginate-comments", label: "Paginate comments", method: "GET", path: "/posts/1/comments?limit=1&offset=1" },
  {
    id: "create-comment",
    label: "Create comment",
    method: "POST",
    path: "/posts/1/comments",
    body: { author_id: 1, body: "This was helpful." },
  },
  {
    id: "create-reply",
    label: "Create reply",
    method: "POST",
    path: "/posts/1/comments",
    body: { author_id: 2, parent_id: 1, body: "I agree." },
  },
  {
    id: "moderate-visible",
    label: "Moderate visible",
    method: "PATCH",
    path: "/comments/3/status",
    body: { status: "visible" },
  },
  {
    id: "moderate-hidden",
    label: "Moderate hidden",
    method: "PATCH",
    path: "/comments/1/status",
    body: { status: "hidden" },
  },
];
