import type { Township } from "@sdh/contracts";

import { useApiResource } from "./useApiResource";

// The township every screen is about; public, so it loads before sign-in too.
export function useTownship() {
  const { data, loading, error, reload } = useApiResource<Township>("/api/township");
  return { township: data, loading, error, reload };
}
