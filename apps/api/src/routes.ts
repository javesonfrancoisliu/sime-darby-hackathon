import type { Route } from "./lib/http";
import { contributionRoutes } from "./modules/contributions/routes";
import { eventRoutes } from "./modules/events/routes";
import { healthRoutes } from "./modules/health/routes";
import { opportunityRoutes } from "./modules/opportunities/routes";
import { requestRoutes } from "./modules/requests/routes";
import { userRoutes } from "./modules/users/routes";

// Routes served by the core API Lambda. Matching runs in its own Lambda, so it is not imported here
// and the core bundle stays free of the Anthropic and SSM clients.
// Literal paths (for example /api/requests/mine) must come before {param} paths they overlap.
export const coreRoutes: Route[] = [
  ...healthRoutes,
  ...userRoutes,
  ...contributionRoutes,
  ...requestRoutes,
  ...opportunityRoutes,
  ...eventRoutes,
];
