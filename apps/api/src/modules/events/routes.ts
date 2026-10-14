import { CreateEventBody, Id, type CommunityEvent, type EventsResponse } from "@sdh/contracts";
import { HttpError, ok, type Route } from "../../lib/http";
import { DEMO_USER_HEADER, requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { complete, createEvent, join, listEvents } from "./service";

export const eventRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/events",
    handler: async (req) => {
      // Public route: an unknown or absent demo user just omits the joined flag.
      let viewer;
      if (req.headers[DEMO_USER_HEADER]) {
        try {
          viewer = await requireUser(req);
        } catch (error) {
          if (!(error instanceof HttpError && error.code === "UNAUTHENTICATED")) throw error;
        }
      }
      return ok({ events: await listEvents(viewer) } satisfies EventsResponse);
    },
  },
  {
    method: "POST",
    path: "/api/events",
    handler: async (req) => {
      const coordinator = await requireUser(req, "coordinator");
      const body = parse(CreateEventBody, req.body);
      return ok((await createEvent(coordinator, body)) satisfies CommunityEvent, 201);
    },
  },
  {
    method: "POST",
    path: "/api/events/{id}/join",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "volunteer");
      if (user.role === "volunteer" && user.verification !== "verified") {
        throw new HttpError("FORBIDDEN", "Your volunteer profile is not verified yet");
      }
      const id = parse(Id, req.params.id);
      return ok((await join(user, id)) satisfies CommunityEvent);
    },
  },
  {
    method: "POST",
    path: "/api/events/{id}/complete",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const id = parse(Id, req.params.id);
      return ok((await complete(id)) satisfies CommunityEvent);
    },
  },
];
