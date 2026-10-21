import {
  CreateRewardBody,
  Id,
  type RedeemResult,
  type Redemption,
  type Reward,
  type RewardsResponse,
} from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireNotRejected, requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { createReward, listFor, redeemReward, useReward } from "./service";

export const rewardRoutes: Route[] = [
  {
    method: "POST",
    path: "/api/rewards/{id}/use",
    handler: async (req) => {
      const user = await requireNotRejected(req, "elder", "volunteer");
      const id = parse(Id, req.params.id);
      return ok((await useReward(user, id)) satisfies Redemption);
    },
  },
  {
    method: "GET",
    path: "/api/rewards",
    handler: async (req) => {
      const user = await requireUser(req);
      return ok({ rewards: await listFor(user) } satisfies RewardsResponse);
    },
  },
  {
    method: "POST",
    path: "/api/rewards",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const body = parse(CreateRewardBody, req.body);
      return ok((await createReward(body)) satisfies Reward, 201);
    },
  },
  {
    method: "POST",
    path: "/api/rewards/{id}/redeem",
    handler: async (req) => {
      const user = await requireNotRejected(req, "elder", "volunteer");
      const id = parse(Id, req.params.id);
      return ok((await redeemReward(user, id)) satisfies RedeemResult);
    },
  },
];
