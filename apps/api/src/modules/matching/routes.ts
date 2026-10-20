import { Id, type MatchesResponse } from "@sdh/contracts";
import { HttpError, ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { getRequest } from "../requests/repository";
import { listUsersByRole } from "../users/repository";
import { matchVolunteers } from "./service";
import { opportunityRoutes } from "../opportunities/routes";

export const matchingRoutes: Route[] = [
  ...opportunityRoutes,
  {
    method: "GET",
    path: "/api/requests/{id}/matches",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "coordinator");
      const request = await getRequest(parse(Id, req.params.id));
      const visible = request && (user.role === "coordinator" || request.elderId === user.id);
      if (!request || !visible) throw new HttpError("NOT_FOUND", "Request not found");
      // Elders see suggestions once a request is open, so held requests cannot be used to probe
      // where volunteers live; coordinators also see them while reviewing.
      const matchable =
        request.status === "open" ||
        (request.status === "pending_review" && user.role === "coordinator");
      if (!matchable) {
        throw new HttpError("CONFLICT", "Suggestions are available once the request is approved");
      }
      if (Date.parse(request.scheduledAt) <= Date.now()) {
        throw new HttpError(
          "CONFLICT",
          "Suggestions are unavailable after the requested start time",
        );
      }

      const volunteers = await listUsersByRole("volunteer", "verified");
      return ok((await matchVolunteers(request, volunteers)) satisfies MatchesResponse);
    },
  },
];
