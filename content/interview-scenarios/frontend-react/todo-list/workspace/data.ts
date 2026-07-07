import type { Todo } from "./types";

// Five seed todos, a mix of complete and incomplete, so filtering has
// something meaningful to show for every tab.
export const INITIAL_TODOS: Todo[] = [
  { id: "t1", text: "Write project README", completed: true },
  { id: "t2", text: "Set up CI pipeline", completed: true },
  { id: "t3", text: "Fix login redirect bug", completed: false },
  { id: "t4", text: "Add dark mode toggle", completed: false },
  { id: "t5", text: "Review pull request #42", completed: false },
];
