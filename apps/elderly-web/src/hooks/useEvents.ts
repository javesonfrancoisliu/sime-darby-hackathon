import { eventsApi } from "../api/events";
import { useLiveQuery } from "./useLiveQuery";
import { useMutation } from "./useMutation";

export function useEvents() {
  return useLiveQuery("events", eventsApi.list);
}

export function useJoinEvent() {
  return useMutation(eventsApi.join);
}
