import { useEffect, useState } from "react";
import type { User } from "../../workspace/types";
import { searchUsers } from "../../workspace/api";

// Step 3 reference solution: the query-driven search logic (fetching, loading,
// and the Step 2 stale-response guard) extracted into a reusable hook so a
// second page can reuse it. Behavior is identical to Step 2 — this is one valid
// way to make the logic reusable; the step is graded on reusability, not on this
// exact shape.
export function useUserSearch(query: string): { results: User[]; loading: boolean } {
  // The latest settled response, tagged with the query it was for. Storing the
  // query alongside the users lets us DERIVE `loading` and the empty state,
  // instead of calling setState synchronously inside the effect.
  const [settled, setSettled] = useState<{ query: string; users: User[] }>({
    query: "",
    users: [],
  });

  useEffect(() => {
    if (query.trim() === "") return;
    let ignore = false;
    searchUsers(query).then((users) => {
      if (!ignore) setSettled({ query, users });
    });
    return () => {
      ignore = true;
    };
  }, [query]);

  const trimmed = query.trim();
  const isCurrent = settled.query === query;
  const results = trimmed !== "" && isCurrent ? settled.users : [];
  const loading = trimmed !== "" && !isCurrent;
  return { results, loading };
}
