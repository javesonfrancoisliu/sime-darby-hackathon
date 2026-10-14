import type { ContributionsResponse } from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { summarise } from "./service";

export const contributionRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/contributions/mine",
    handler: async (req) => {
      const volunteer = await requireUser(req, "volunteer");
      return ok((await summarise(volunteer.id)) satisfies ContributionsResponse);
    },
  },
];
