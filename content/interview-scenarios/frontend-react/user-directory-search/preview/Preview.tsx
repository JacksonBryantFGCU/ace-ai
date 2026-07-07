import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.UserSearch;

type Mode = "default" | "empty" | "large-dataset" | "loading";

interface PreviewUser {
  id: number;
  name: string;
  email: string;
}

// "default"/"mobile" render the ACTUAL live candidate code — an empty query
// with no results wired up yet. "empty"/"large-dataset"/"loading" illustrate
// the target states search itself will produce once implemented: no matches,
// many matches, and an in-flight request. All self-contained, deterministic,
// read-only mock UI — never a real network call.
const NAMES = [
  "Alice Nguyen", "Alfred Stone", "Bianca Rossi", "Carlos Diaz", "Dana Klein", "Ellis Ward",
  "Farah Aziz", "Grace Okoro", "Hana Kobayashi", "Ivo Petrov", "Jael Weiss", "Kwame Mensah",
  "Lena Fischer", "Milo Andersen", "Noor Haddad",
];

function largeResults(): PreviewUser[] {
  return NAMES.map((name, i) => ({
    id: i + 1,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
  }));
}

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? (
        <CandidateEntry />
      ) : (
        <IllustrativeSearch
          query={mode === "empty" ? "zzzzz" : "a"}
          loading={mode === "loading"}
          users={mode === "large-dataset" ? largeResults() : []}
        />
      )}
    </Frame>
  );
}

function IllustrativeSearch({ query, loading, users }: { query: string; loading: boolean; users: PreviewUser[] }) {
  return (
    <div>
      <input
        type="search"
        aria-label="Search users"
        placeholder="Search users"
        value={query}
        onChange={() => {}}
        readOnly
      />
      {loading ? (
        <p role="status" aria-label="Loading results" style={{ color: "#6b7280", padding: "16px 0" }}>
          Searching…
        </p>
      ) : users.length === 0 ? (
        <p style={{ color: "#6b7280", padding: "16px 0" }}>No users match &quot;{query}&quot;.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, maxHeight: 360, overflowY: "auto" }}>
          {users.map((user) => (
            <li key={user.id} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ fontWeight: 500 }}>{user.name}</div>
              <div style={{ color: "#6b7280", fontSize: 13 }}>{user.email}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
