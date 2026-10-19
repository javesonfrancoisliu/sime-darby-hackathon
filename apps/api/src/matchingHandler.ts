import { createHandler } from "./lib/lambda";
import { matchingRoutes } from "./modules/matching/routes";
import { createRouter } from "./router";

// Matching runs alone so only this Lambda reads the Anthropic API key and has the longer timeout.
export const handler = createHandler(createRouter(matchingRoutes));
