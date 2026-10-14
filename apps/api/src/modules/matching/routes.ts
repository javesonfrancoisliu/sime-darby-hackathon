import { Id, type MatchesResponse } from "@sdh/contracts";
import { HttpError, ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { getRequest } from "../requests/repository";
import { listUsersByRole } from "../users/repository";
import { selectReranker, toMatches } from "./reranker";
import { rankVolunteers } from "./scoring";

// Suggestions only make sense before someone has taken the request.
const MATCHABLE = new Set(["pending_review", "open"]);

export const matchingRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/requests/{id}/matches",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "coordinator");
      const request = await getRequest(parse(Id, req.params.id));
      const visible = request && (user.role === "coordinator" || request.elderId === user.id);
      if (!request || !visible) throw new HttpError("NOT_FOUND", "Request not found");
      if (!MATCHABLE.has(request.status)) {
        throw new HttpError(
          "CONFLICT",
          "Suggestions are only available before a volunteer is assigned",
        );
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
