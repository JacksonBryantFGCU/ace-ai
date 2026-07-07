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

// Step 2 reference solution: date-range and event-type filters, the
// advanced metrics (conversion rate, revenue, daily trend), and a minimal
// per-day bar visualization are added.
//
// The filtered events are memoized, but the dependency array only lists
// `EVENTS` -- a module-level constant that never changes -- instead of the
// filter state that actually drives the computation. React skips
// recomputing on every later render, so `filteredEvents` stays frozen at
// whatever the FIRST render produced (the default filters). The controls
// respond to clicks, but the metrics and table never move. Step 3 fixes the
// dependency list.
export function Dashboard() {
  const [range, setRange] = useState<DateRange>("all");
  const [types, setTypes] = useState<EventType[]>(ALL_TYPES);

  const filteredEvents = useMemo(() => filterEvents(EVENTS, { range, types }, NOW), [EVENTS]);
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
