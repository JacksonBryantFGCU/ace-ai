import { useMemo, useState } from "react";
import { EVENTS, NOW } from "../../workspace/events";
import type { EventType } from "../../workspace/events";
import { computeMetrics, filterEvents } from "../../workspace/analytics";
import type { DateRange } from "../../workspace/analytics";

const ALL_TYPES: EventType[] = ["click", "purchase", "signup", "view"];
const TYPE_LABELS: Record<EventType, string> = {
  click: "Clicks",
  purchase: "Purchases",
  signup: "Signups",
  view: "Views",
};

// Step 3 reference solution: the memo's dependency list now names the
// actual inputs the computation depends on -- `range` and `types` -- instead
// of the never-changing `EVENTS` constant. Every filter change now
// recomputes `filteredEvents` (and everything derived from it) on the same
// render that changed it.
export function Dashboard() {
  const [range, setRange] = useState<DateRange>("all");
  const [types, setTypes] = useState<EventType[]>(ALL_TYPES);

  const filteredEvents = useMemo(() => filterEvents(EVENTS, { range, types }, NOW), [range, types]);
  const metrics = computeMetrics(filteredEvents);

  function toggleType(type: EventType) {
    setTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  }

  return (
    <div>
      <div>
        <label>
          Date range
          <select value={range} onChange={(e) => setRange(e.target.value as DateRange)}>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </label>

        <fieldset>
          <legend>Event types</legend>
          {ALL_TYPES.map((type) => (
            <label key={type}>
              <input type="checkbox" checked={types.includes(type)} onChange={() => toggleType(type)} />
              {TYPE_LABELS[type]}
            </label>
          ))}
        </fieldset>
      </div>

      <section aria-label="Metrics">
        <p>Total events: {metrics.totalEvents}</p>
        <p>Unique users: {metrics.uniqueUsers}</p>
        {ALL_TYPES.map((type) => (
          <p key={type}>
            {TYPE_LABELS[type]}: {metrics.eventsByType[type]}
          </p>
        ))}
        <p>Conversion rate: {metrics.conversionRate}%</p>
        <p>Total revenue: ${metrics.totalRevenue.toFixed(2)}</p>
      </section>

      <section aria-label="Trend">
        {metrics.eventsByDay.length === 0 ? (
          <p>No events in this range.</p>
        ) : (
          <ul>
            {metrics.eventsByDay.map((point) => (
              <li key={point.date}>
                <span>{point.date}</span>
                <span
                  aria-hidden
                  style={{ display: "inline-block", width: point.count * 10, height: 8, background: "steelblue" }}
                />
                <span>{point.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {filteredEvents.length === 0 ? (
        <p>No events match the current filters.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Timestamp</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.type}</td>
                <td>{new Date(event.timestamp).toISOString()}</td>
                <td>{event.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
