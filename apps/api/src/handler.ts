import { createHandler } from "./lib/lambda";
import { createRouter } from "./router";
import { coreRoutes } from "./routes";

export const handler = createHandler(createRouter(coreRoutes));
