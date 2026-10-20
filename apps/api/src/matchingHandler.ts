import { createHandler } from "./lib/lambda";
import { matchingRoutes } from "./modules/matching/routes";
import { createRouter } from "./router";

// Personalized opportunities and legacy matching share this read-only, secret-owning Lambda.
export const handler = createHandler(createRouter(matchingRoutes));
