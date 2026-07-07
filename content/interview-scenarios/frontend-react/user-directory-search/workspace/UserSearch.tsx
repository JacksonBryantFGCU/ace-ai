import { useState } from "react";
import type { User } from "./types";
import { searchUsers } from "./api";

// A user directory search. The query input below is already wired up for you.
//
// TODO (Step 1): when the query changes, call `searchUsers(query)` and render the
// matching users (name and email). Show a loading indicator while a search is in
// flight, and an empty state when a completed search returns no users.
export function UserSearch() {
  const [query, setQuery] = useState("");

  return (
    <div>
      <input
        type="search"
        aria-label="Search users"
        placeholder="Search users"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {/* Render the loading indicator, the empty state, and the results list here. */}
    </div>
  );
}
