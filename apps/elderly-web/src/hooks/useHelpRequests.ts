import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, api } from "../api/client";
import type { ApiError, CreateHelpRequestInput, HelpRequest } from "../api/client";

type QueryStatus = "loading" | "error" | "success";
type MutationStatus = "idle" | "loading" | "error" | "success";

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiRequestError) return { code: e.code, message: e.message };
  return { code: "INTERNAL", message: "Something went wrong. Please try again." };
}

export function useHelpRequests() {
  const [data, setData] = useState<HelpRequest[]>();
  const [status, setStatus] = useState<QueryStatus>("loading");
  const [error, setError] = useState<ApiError>();

  const refetch = useCallback(() => {
    setStatus("loading");
    setError(undefined);
    api
      .listHelpRequests()
      .then((res) => {
        setData(res);
        setStatus("success");
      })
      .catch((e) => {
        setError(toApiError(e));
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, status, error, refetch };
}

export function useHelpRequest(id: string) {
  const [data, setData] = useState<HelpRequest>();
  const [status, setStatus] = useState<QueryStatus>("loading");
  const [error, setError] = useState<ApiError>();

  const refetch = useCallback(() => {
    setStatus("loading");
    setError(undefined);
    api
      .getHelpRequest(id)
      .then((res) => {
        setData(res);
        setStatus("success");
      })
      .catch((e) => {
        setError(toApiError(e));
        setStatus("error");
      });
  }, [id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, status, error, refetch };
}

export function useCreateHelpRequest() {
  const [status, setStatus] = useState<MutationStatus>("idle");
  const [error, setError] = useState<ApiError>();

  const submit = useCallback(async (input: CreateHelpRequestInput) => {
    setStatus("loading");
    setError(undefined);
    try {
      const created = await api.createHelpRequest(input);
      setStatus("success");
      return created;
    } catch (e) {
      setError(toApiError(e));
      setStatus("error");
      throw e;
    }
  }, []);

  return { submit, status, error };
}

export function useCancelHelpRequest() {
  const [status, setStatus] = useState<MutationStatus>("idle");
  const [error, setError] = useState<ApiError>();

  const cancel = useCallback(async (id: string) => {
    setStatus("loading");
    setError(undefined);
    try {
      const updated = await api.cancelHelpRequest(id);
      setStatus("success");
      return updated;
    } catch (e) {
      setError(toApiError(e));
      setStatus("error");
      throw e;
    }
  }, []);

  return { cancel, status, error };
}
