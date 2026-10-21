import { matchingRoutes } from "./modules/matching/routes";
import { createRouter } from "./router";
import { coreRoutes } from "./routes";

// Every route in one process, for the local dev server and tests. In AWS, API Gateway sends
// GET /api/opportunities and GET /api/requests/{id}/matches to the matching Lambda.
// Matching first: its AI opportunities feed must win over the rules-only copy in core.
export const routes = [...matchingRoutes, ...coreRoutes];

export const dispatch = createRouter(routes);
