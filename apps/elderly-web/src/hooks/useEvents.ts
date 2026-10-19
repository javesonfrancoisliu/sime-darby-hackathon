import type { EventPurpose } from "@sdh/contracts";
import { eventsApi } from "../api/events";
import { REFRESH_INTERVAL_MS, useLiveQuery } from "./useLiveQuery";
import { useMutation } from "./useMutation";

export function useEvents(purpose?: EventPurpose) {
  return useLiveQuery(
    `events:${purpose ?? "all"}`,
    () => eventsApi.list(purpose),
    REFRESH_INTERVAL_MS,
  );
}

export function useJoinEvent() {
  return useMutation(eventsApi.join);
}
