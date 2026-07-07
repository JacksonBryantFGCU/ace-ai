import { EVENTS } from "./events";
import { computeMetrics } from "./analytics";

// An analytics dashboard. The raw events already render in a table below;
// the metrics summary above it isn't computed yet.
//
// TODO (Step 1): finish `computeMetrics` in analytics.ts (totalEvents,
// uniqueUsers, eventsByType) and display those numbers here.
export function Dashboard() {
  const metrics = computeMetrics(EVENTS);
  void metrics;

  return (
    <div>
      <section aria-label="Metrics" />

      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Timestamp</th>
            <th>User</th>
          </tr>
        </thead>
        <tbody>
          {EVENTS.map((event) => (
            <tr key={event.id}>
              <td>{event.type}</td>
              <td>{new Date(event.timestamp).toISOString()}</td>
              <td>{event.userId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
