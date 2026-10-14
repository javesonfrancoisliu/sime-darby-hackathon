import { OpportunitiesQuery, type OpportunitiesResponse } from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireVerifiedVolunteer } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { listOpportunities } from "./service";

export const opportunityRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/opportunities",
    handler: async (req) => {
      const volunteer = await requireVerifiedVolunteer(req);
      const query = parse(OpportunitiesQuery, req.query);
      return ok({
        items: await listOpportunities(volunteer, query),
      } satisfies OpportunitiesResponse);
    },
  },
];
