import { useEffect, useState } from "react";
import type { User } from "../../workspace/types";
import { searchUsers } from "../../workspace/api";

// Step 2 reference solution: the out-of-order race is fixed with an `ignore`
// flag cleared in the effect cleanup, so a stale earlier response can never
// overwrite the latest query's results. (An AbortController or a latest-query
// comparison are equally valid; the graded contract is "latest query wins".)
export function UserSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Loading is set in the input handler, so this effect never calls setState
  // synchronously. The `ignore` flag (set on cleanup when the query changes)
  // discards a stale response, so the latest query always wins.
  useEffect(() => {
    if (query.trim() === "") return;
    let ignore = false;
    searchUsers(query).then((users) => {
      if (ignore) return;
      setResults(users);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
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
