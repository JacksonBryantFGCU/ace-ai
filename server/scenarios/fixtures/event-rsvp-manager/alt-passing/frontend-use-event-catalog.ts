// ALT-PASSING fixture: extracted data hook for event-rsvp-manager step 2.
//
// Reference solution keeps all fetch/state wiring inline inside `App`. This
// fixture pulls it into a dedicated hook (different module boundary, same
// network calls / same derived state) to prove verification doesn't care how
// the candidate organizes their React code as long as the product behavior
// and accessible contract match.

import { useEffect, useState } from "react";
import { fetchEvent, fetchEvents } from "./api";
import type { EventDetail, EventStatus, EventSummary } from "./types";

export type StatusFilterValue = EventStatus | "all";
export type AvailabilityFilterValue = "all" | "open" | "full";

function replaceById(list: EventSummary[], updated: EventSummary): EventSummary[] {
  return list.map((item) => (item.id === updated.id ? updated : item));
}

export function useEventCatalog() {
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilterValue>("all");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let stale = false;
    setEventsLoading(true);
    setEventsError(null);
    fetchEvents({ status: statusFilter, availability: availabilityFilter })
      .then((items) => {
        if (stale) return;
        setEvents(items);
        setSelectedId((current) => current ?? (items.length > 0 ? items[0]!.id : null));
      })
      .catch((err: Error) => {
        if (!stale) setEventsError(err.message);
      })
      .finally(() => {
        if (!stale) setEventsLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [statusFilter, availabilityFilter]);

  function applyUpdatedEvent(updated: EventSummary) {
    setEvents((current) => replaceById(current, updated));
  }

  return {
    statusFilter,
    setStatusFilter,
    availabilityFilter,
    setAvailabilityFilter,
    events,
    eventsLoading,
    eventsError,
    selectedId,
    setSelectedId,
    applyUpdatedEvent,
  };
}

export function useEventDetail(selectedId: number | null) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    let stale = false;
    setDetailLoading(true);
    setDetailError(null);
    fetchEvent(selectedId)
      .then((event) => {
        if (!stale) setDetail(event);
      })
      .catch((err: Error) => {
        if (!stale) setDetailError(err.message);
      })
      .finally(() => {
        if (!stale) setDetailLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [selectedId]);

  return { detail, setDetail, detailLoading, detailError };
}
