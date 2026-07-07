import { useEffect, useState } from "react";
import type { User } from "../../workspace/types";
import { searchUsers } from "../../workspace/api";

// Step 1 reference solution: a working live search. It is intentionally the
// straightforward, naive implementation — correct for a single settled query,
// but it contains the out-of-order-response race that Step 2 fixes.
export function UserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Loading is set when the user types (in the input handler), so this effect
  // never calls setState synchronously — it only starts the request and sets
  // state from the async response.
  useEffect(() => {
    if (query.trim() === "") return;
    searchUsers(query).then((users) => {
      setResults(users);
      setLoading(false);
    });
  }, [query]);

  const showEmpty = !loading && query.trim() !== "" && results.length === 0;

  return (
    <div>
      <input
        type="search"
        aria-label="Search users"
        placeholder="Search users"
        value={query}
        onChange={(e) => {
          const value = e.target.value;
          setQuery(value);
          setLoading(value.trim() !== "");
          if (value.trim() === "") setResults([]);
        }}
      />
      {loading && <p role="status">Searching…</p>}
      {showEmpty && <p>No users found.</p>}
      <ul>
        {results.map((user) => (
          <li key={user.id}>
            {user.name} — {user.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
