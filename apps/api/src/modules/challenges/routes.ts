import {
  ChallengeProgressBody,
  ChallengesQuery,
  Id,
  type Challenge,
  type ChallengeActionResult,
  type ChallengesResponse,
  type ContributeResult,
  CreateChallengeBody,
  type PendingVerificationsResponse,
} from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import {
  complete,
  contribute,
  createChallenge,
  join,
  listFor,
  pendingFor,
  updateProgress,
  verify,
} from "./service";

export const challengeRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/challenges",
    handler: async (req) => {
      const user = await requireUser(req);
      const query = parse(ChallengesQuery, req.query);
      return ok({ challenges: await listFor(user, query) } satisfies ChallengesResponse);
    },
  },
  {
    method: "POST",
    path: "/api/challenges",
    handler: async (req) => {
      const coordinator = await requireUser(req, "coordinator");
      const body = parse(CreateChallengeBody, req.body);
      return ok((await createChallenge(coordinator, body)) satisfies Challenge, 201);
    },
  },
  {
    method: "POST",
    path: "/api/challenges/{id}/join",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "volunteer");
      const id = parse(Id, req.params.id);
      return ok((await join(user, id)) satisfies ChallengeActionResult);
    },
  },
  {
    method: "PUT",
    path: "/api/challenges/{id}/progress",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "volunteer");
      const id = parse(Id, req.params.id);
      const body = parse(ChallengeProgressBody, req.body);
      return ok((await updateProgress(user, id, body.current)) satisfies ChallengeActionResult);
    },
  },
  {
    method: "POST",
    path: "/api/challenges/{id}/complete",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "volunteer");
      const id = parse(Id, req.params.id);
      return ok((await complete(user, id)) satisfies ChallengeActionResult);
    },
  },
  {
    method: "POST",
    path: "/api/challenges/{id}/contribute",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "volunteer");
      const id = parse(Id, req.params.id);
      return ok((await contribute(user, id)) satisfies ContributeResult);
    },
  },
  {
    method: "GET",
    path: "/api/challenges/{id}/pending",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const id = parse(Id, req.params.id);
      return ok({ pending: await pendingFor(id) } satisfies PendingVerificationsResponse);
    },
  },
  {
    method: "POST",
    path: "/api/challenges/{id}/verify/{userId}",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const id = parse(Id, req.params.id);
      const userId = parse(Id, req.params.userId);
      return ok((await verify(id, userId)) satisfies ChallengeActionResult);
    },
  },
];
