import * as ScenarioEntry from "scenario:entry";
import { Frame } from "./providers";
const CandidateEntry = ScenarioEntry.Dashboard;

type Mode = "default" | "empty" | "large-dataset";

interface PreviewMetrics {
  totalEvents: number;
  uniqueUsers: number;
  conversionRate: number;
  totalRevenue: number;
}
interface PreviewEvent {
  id: string;
  type: "click" | "purchase" | "signup" | "view";
  timestamp: string;
  userId: string;
}

// "default"/"mobile" render the ACTUAL live candidate code — the raw event
// table already renders, but the metrics summary above it is still all
// zeros (`computeMetrics` isn't implemented yet). "empty" illustrates truly
// no events in range; "large-dataset" illustrates the fully-computed
// dashboard at realistic volume — both self-contained, deterministic mock
// UI, not derived from the candidate's (still-stubbed) computation.
function largeEvents(): PreviewEvent[] {
  const types: PreviewEvent["type"][] = ["view", "click", "signup", "purchase"];
  return Array.from({ length: 40 }, (_, i) => ({
    id: `e${i}`,
    type: types[i % types.length]!,
    timestamp: `2026-06-${String(1 + (i % 28)).padStart(2, "0")}T12:00:00.000Z`,
    userId: `u${1 + (i % 12)}`,
  }));
}

const LARGE_METRICS: PreviewMetrics = { totalEvents: 512, uniqueUsers: 138, conversionRate: 0.34, totalRevenue: 6842.5 };

export default function Preview(props: { mode?: Mode; theme?: "light" | "dark" }) {
  const mode = props.mode ?? "default";
  return (
    <Frame theme={props.theme}>
      {mode === "default" ? (
        <CandidateEntry />
      ) : (
        <IllustrativeDashboard
          metrics={mode === "large-dataset" ? LARGE_METRICS : { totalEvents: 0, uniqueUsers: 0, conversionRate: 0, totalRevenue: 0 }}
          events={mode === "large-dataset" ? largeEvents() : []}
        />
      )}
    </Frame>
  );
}

function IllustrativeDashboard({ metrics, events }: { metrics: PreviewMetrics; events: PreviewEvent[] }) {
  const cards = [
    { label: "Total events", value: metrics.totalEvents.toLocaleString() },
    { label: "Unique users", value: metrics.uniqueUsers.toLocaleString() },
    { label: "Conversion rate", value: `${(metrics.conversionRate * 100).toFixed(0)}%` },
    { label: "Revenue", value: `$${metrics.totalRevenue.toLocaleString()}` },
  ];
  return (
    <div>
      <section aria-label="Metrics" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, minWidth: 120 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{c.value}</div>
          </div>
        ))}
      </section>

      {events.length === 0 ? (
        <p style={{ color: "#6b7280", textAlign: "center", padding: "32px 0" }}>No events in this range.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Type", "Timestamp", "User"].map((h) => (
                <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: "6px 4px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.slice(0, 10).map((event) => (
              <tr key={event.id}>
                <td style={{ padding: "6px 4px" }}>{event.type}</td>
                <td style={{ padding: "6px 4px" }}>{event.timestamp}</td>
                <td style={{ padding: "6px 4px" }}>{event.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
