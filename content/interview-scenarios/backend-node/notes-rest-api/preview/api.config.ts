export const config = {
  title: "Notes API Explorer",
  defaultExampleId: "list-notes",
};

export const apiExamples = [
  {
    id: "list-notes",
    label: "List notes",
    method: "GET",
    path: "/notes",
  },
  {
    id: "get-note",
    label: "Get note by ID",
    method: "GET",
    path: "/notes/1",
  },
  {
    id: "create-note",
    label: "Create note",
    method: "POST",
    path: "/notes",
    body: {
      title: "Planning notes",
      content: "Write backend scenario prompts",
    },
  },
  {
    id: "delete-note",
    label: "Delete note",
    method: "DELETE",
    path: "/notes/1",
  },
];
