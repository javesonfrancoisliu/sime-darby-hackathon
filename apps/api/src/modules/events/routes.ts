import {
  CreateEventBody,
  EventsQuery,
  Id,
  type CommunityEvent,
  type EventsResponse,
} from "@sdh/contracts";
import { HttpError, ok, type Route } from "../../lib/http";
import { optionalUser, requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { complete, createEvent, join, listEvents } from "./service";

export const eventRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/events",
    handler: async (req) => {
      // Public route: no, unknown or unverifiable identity just omits the joined flag.
      const viewer = await optionalUser(req);
      const { purpose } = parse(EventsQuery, req.query);
      return ok({ events: await listEvents(viewer, purpose) } satisfies EventsResponse);
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
