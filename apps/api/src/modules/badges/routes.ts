import { CreateBadgeBody, type Badge, type BadgesResponse } from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { createBadge, listFor } from "./service";

export const badgeRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/badges",
    handler: async (req) => {
      const user = await requireUser(req);
      return ok({ badges: await listFor(user) } satisfies BadgesResponse);
    },
  },
  {
    method: "POST",
    path: "/api/badges",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const body = parse(CreateBadgeBody, req.body);
      return ok((await createBadge(body)) satisfies Badge, 201);
    },
  },
];
