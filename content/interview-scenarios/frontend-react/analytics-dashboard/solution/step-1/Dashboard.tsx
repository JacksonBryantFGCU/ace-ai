import { EVENTS } from "../../workspace/events";
import type { EventType } from "../../workspace/events";
import { computeMetrics } from "../../workspace/analytics";

const TYPE_LABELS: Record<EventType, string> = {
  click: "Clicks",
  purchase: "Purchases",
  signup: "Signups",
  view: "Views",
};

// Step 1 reference solution: the metrics summary now displays the basic
// counts computed by `computeMetrics`.
export function Dashboard() {
  const metrics = computeMetrics(EVENTS);

  return (
    <div>
      <section aria-label="Metrics">
        <p>Total events: {metrics.totalEvents}</p>
        <p>Unique users: {metrics.uniqueUsers}</p>
        {(Object.keys(TYPE_LABELS) as EventType[]).map((type) => (
          <p key={type}>
            {TYPE_LABELS[type]}: {metrics.eventsByType[type]}
          </p>
        ))}
      </section>

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
