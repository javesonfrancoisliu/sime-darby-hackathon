import { OpportunitiesQuery, type OpportunitiesResponse } from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireVerifiedVolunteer } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { listOpportunities, type OpportunityRanker } from "./service";

export const createOpportunityRoutes = (rank?: OpportunityRanker): Route[] => [
  {
    method: "GET",
    path: "/api/opportunities",
    handler: async (req) => {
      const volunteer = await requireVerifiedVolunteer(req);
      const query = parse(OpportunitiesQuery, req.query);
      return ok({
        items: await listOpportunities(volunteer, query, rank),
      } satisfies OpportunitiesResponse);
    },
  },
];

// Rules only: served by the core Lambda until API Gateway routes the feed to the matching Lambda.
export const opportunityRoutes = createOpportunityRoutes();
