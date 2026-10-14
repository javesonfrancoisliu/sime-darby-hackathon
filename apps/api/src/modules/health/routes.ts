import type { HealthResponse } from "@sdh/contracts";
import { config } from "../../lib/config";
import { ok, type Route } from "../../lib/http";

export const healthRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/health",
    handler: () =>
      ok({
        status: "ok",
        service: config.serviceName,
        time: new Date().toISOString(),
      } satisfies HealthResponse),
  },
];
