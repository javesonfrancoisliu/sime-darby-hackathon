import { apiFetch } from "@sdh/api-client";
import type { CommunityEvent, EventsResponse } from "@sdh/contracts";
import { isMockMode } from "../config";
import * as mock from "../mock/mockBackend";

export const eventsApi = {
  async list(): Promise<CommunityEvent[]> {
    if (isMockMode()) return mock.listEvents();
    return (await apiFetch<EventsResponse>("/api/events")).events;
  },
  join(id: string): Promise<CommunityEvent> {
    if (isMockMode()) return mock.joinEvent(id);
    return apiFetch<CommunityEvent>(`/api/events/${encodeURIComponent(id)}/join`, {
      method: "POST",
    });
  },
};
