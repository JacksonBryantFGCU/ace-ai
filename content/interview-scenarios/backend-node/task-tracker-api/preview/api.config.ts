export const config = {
  title: "Task Tracker API Explorer",
  defaultExampleId: "list-tasks",
};

export const apiExamples = [
  {
    id: "list-tasks",
    label: "List tasks",
    method: "GET",
    path: "/tasks",
  },
  {
    id: "filter-todo",
    label: "Filter todo tasks",
    method: "GET",
    path: "/tasks?status=todo",
  },
  {
    id: "sort-priority",
    label: "Sort by priority",
    method: "GET",
    path: "/tasks?sort=priority",
  },
  {
    id: "update-status",
    label: "Update task status",
    method: "PATCH",
    path: "/tasks/1/status",
    body: {
      status: "done",
    },
  },
  {
    id: "summary",
    label: "Task summary",
    method: "GET",
    path: "/tasks/summary",
  },
];
