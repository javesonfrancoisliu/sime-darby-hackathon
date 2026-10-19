import { apiFetch } from "@sdh/api-client";
import type { CommunityEvent, EventPurpose, EventsResponse } from "@sdh/contracts";

export const eventsApi = {
  async list(purpose?: EventPurpose): Promise<CommunityEvent[]> {
    const query = purpose ? `?purpose=${purpose}` : "";
    return (await apiFetch<EventsResponse>(`/api/events${query}`)).events;
  },
  join(id: string): Promise<CommunityEvent> {
    return apiFetch<CommunityEvent>(`/api/events/${encodeURIComponent(id)}/join`, {
      method: "POST",
    });
  },
};
