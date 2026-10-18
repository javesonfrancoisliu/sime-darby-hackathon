import { matchingRoutes } from "./modules/matching/routes";
import { createRouter } from "./router";
import { coreRoutes } from "./routes";

// Every route in one process, for the local dev server and tests. In AWS, API Gateway sends
// GET /api/requests/{id}/matches to the matching Lambda and everything else to the core Lambda.
export const routes = [...coreRoutes, ...matchingRoutes];

export const dispatch = createRouter(routes);
