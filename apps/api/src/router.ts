import { errorResponse, HttpError, type HttpResponse, type Route } from "./lib/http";
import { logger } from "./lib/logger";
import { healthRoutes } from "./modules/health/routes";

export const routes: Route[] = [...healthRoutes];

export interface RawRequest {
  method: string;
  path: string;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  rawBody: string | undefined;
}

interface CompiledRoute {
  route: Route;
  pattern: RegExp;
}

// "/api/requests/{id}/accept" becomes a regex with a named group per {param}.
function compile(route: Route): CompiledRoute {
  const source = route.path
    .split("/")
    .map((segment) => {
      const param = /^\{(\w+)\}$/.exec(segment);
      return param ? `(?<${param[1]}>[^/]+)` : segment.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { route, pattern: new RegExp(`^${source}/?$`) };
}

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    throw new HttpError("VALIDATION_FAILED", "Malformed path parameter");
  }
}

function parseBody(rawBody: string | undefined): unknown {
  if (rawBody === undefined || rawBody === "") return undefined;
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new HttpError("VALIDATION_FAILED", "Request body must be valid JSON");
  }
}

export function createRouter(routeList: Route[]) {
  const compiled = routeList.map(compile);

  return async function dispatch(req: RawRequest): Promise<HttpResponse> {
    try {
      for (const { route, pattern } of compiled) {
        if (route.method !== req.method) continue;
        const match = pattern.exec(req.path);
        if (!match) continue;
        const params: Record<string, string> = {};
        for (const [key, value] of Object.entries(match.groups ?? {})) {
          params[key] = decodeParam(value);
        }
        return await route.handler({
          method: req.method,
          path: req.path,
          params,
          query: req.query,
          headers: req.headers,
          body: parseBody(req.rawBody),
        });
      }
      return errorResponse("NOT_FOUND", `No route for ${req.method} ${req.path}`);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error.code, error.message);
      logger.error("Unhandled error", {
        method: req.method,
        path: req.path,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : String(error),
      });
      return errorResponse("INTERNAL", "Something went wrong");
    }
  };
}

export const dispatch = createRouter(routes);
