import type { User } from "./types";

// A small in-memory user directory. In a real app this would be a network call.
const USERS: User[] = [
  { id: 1, name: "Alice Nguyen", email: "alice@example.com" },
  { id: 2, name: "Alfred Stone", email: "alfred@example.com" },
  { id: 3, name: "Bianca Rossi", email: "bianca@example.com" },
  { id: 4, name: "Carlos Diaz", email: "carlos@example.com" },
  { id: 5, name: "Dana Klein", email: "dana@example.com" },
  { id: 6, name: "Ellis Ward", email: "ellis@example.com" },
  { id: 7, name: "Farah Aziz", email: "farah@example.com" },
  { id: 8, name: "Grace Okoro", email: "grace@example.com" },
];

/**
 * Search the user directory by name or email. Resolves after a short, variable
 * delay to mimic real network latency (which is why responses can arrive out of
 * order). An empty query resolves to an empty list.
 */
export function searchUsers(query: string): Promise<User[]> {
  const q = query.trim().toLowerCase();
  const matches =
    q === ""
      ? []
      : USERS.filter(
          (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
        );
  return new Promise((resolve) => {
    setTimeout(() => resolve(matches), 60 + Math.random() * 140);
  });
}
