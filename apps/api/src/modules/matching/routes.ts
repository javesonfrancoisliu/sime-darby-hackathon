import { Id, type MatchesResponse } from "@sdh/contracts";
import { HttpError, ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { getRequest } from "../requests/repository";
import { listUsersByRole } from "../users/repository";
import { selectReranker, toMatches } from "./reranker";
import { rankVolunteers } from "./scoring";

export const matchingRoutes: Route[] = [
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

      const volunteers = await listUsersByRole("volunteer", "verified");
      const candidates = rankVolunteers(request, volunteers);
      const result = await selectReranker().rerank(request, candidates);
      return ok({
        rankedBy: result.rankedBy,
        matches: toMatches(result, candidates),
      } satisfies MatchesResponse);
    },
  },
];
