import type { SafetyResponse } from "@sdh/contracts";

import { useApiResource } from "./useApiResource";

export function useSafety() {
  return useApiResource<SafetyResponse>("/api/safety");
}
