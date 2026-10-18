import { eventsApi } from "../api/events";
import { REFRESH_INTERVAL_MS, useLiveQuery } from "./useLiveQuery";
import { useMutation } from "./useMutation";

export function useEvents() {
  return useLiveQuery("events", eventsApi.list, REFRESH_INTERVAL_MS);
}

export function useJoinEvent() {
  return useMutation(eventsApi.join);
}
