import {
  PagingQuery,
  type CheckInResult,
  type LeaderboardResponse,
  type PointsSummary,
  type Streak,
} from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { checkIn, leaderboard, pointsSummary, streakFor } from "./service";

export const playRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/me/points",
    handler: async (req) => {
      const user = await requireUser(req);
      const { cursor, limit } = parse(PagingQuery, req.query);
      return ok((await pointsSummary(user, cursor, limit)) satisfies PointsSummary);
    },
  },
  {
    method: "GET",
    path: "/api/me/streak",
    handler: async (req) => {
      const user = await requireUser(req);
      return ok((await streakFor(user.id)) satisfies Streak);
    },
  },
  {
    method: "POST",
    path: "/api/me/check-in",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "volunteer");
      return ok((await checkIn(user)) satisfies CheckInResult);
    },
  },
  {
    method: "GET",
    path: "/api/leaderboard",
    handler: async (req) => {
      const user = await requireUser(req, "volunteer");
      return ok((await leaderboard(user)) satisfies LeaderboardResponse);
    },
  },
];
