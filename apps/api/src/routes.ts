import type { Route } from "./lib/http";
import { badgeRoutes } from "./modules/badges/routes";
import { challengeRoutes } from "./modules/challenges/routes";
import { contributionRoutes } from "./modules/contributions/routes";
import { eventRoutes } from "./modules/events/routes";
import { healthRoutes } from "./modules/health/routes";
import { noticeRoutes } from "./modules/notices/routes";
import { opportunityRoutes } from "./modules/opportunities/routes";
import { playRoutes } from "./modules/play/routes";
import { quizRoutes } from "./modules/quizzes/routes";
import { requestRoutes } from "./modules/requests/routes";
import { rewardRoutes } from "./modules/rewards/routes";
import { safetyRoutes } from "./modules/safety/routes";
import { townshipRoutes } from "./modules/township/routes";
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
  ...townshipRoutes,
  ...noticeRoutes,
  ...safetyRoutes,
  ...challengeRoutes,
  ...quizRoutes,
  ...rewardRoutes,
  ...badgeRoutes,
  ...playRoutes,
];
