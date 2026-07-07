import { useState } from "react";
import { useUserSearch } from "./useUserSearch";

// Step 3 reference solution: the component now owns only the query input and
// rendering; all search behavior lives in the reusable useUserSearch hook.
export function UserSearch() {
  const [query, setQuery] = useState("");
  const { results, loading } = useUserSearch(query);

  const showEmpty = !loading && query.trim() !== "" && results.length === 0;

  return (
    <div>
      <input
        type="search"
        aria-label="Search users"
        placeholder="Search users"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
