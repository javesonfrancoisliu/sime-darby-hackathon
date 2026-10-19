import { requestsApi } from "../api/requests";
import { REFRESH_INTERVAL_MS, useLiveQuery } from "./useLiveQuery";
import { useMutation } from "./useMutation";

// The resident's requests, refreshed so a volunteer accepting shows up without a reload.
export function useMyRequests() {
  return useLiveQuery("mine", requestsApi.listMine, REFRESH_INTERVAL_MS);
}

export function useRequest(id: string) {
  return useLiveQuery(`request:${id}`, () => requestsApi.get(id), REFRESH_INTERVAL_MS);
}

export function useCreateRequest() {
  return useMutation(requestsApi.create);
}

export function useCancelRequest() {
  return useMutation(requestsApi.cancel);
}
