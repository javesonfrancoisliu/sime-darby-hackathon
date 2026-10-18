import { createHandler } from "./lib/lambda";
import { matchingRoutes } from "./modules/matching/routes";
import { createRouter } from "./router";

// Matching runs alone so only this Lambda needs Bedrock access and the longer timeout.
export const handler = createHandler(createRouter(matchingRoutes));
