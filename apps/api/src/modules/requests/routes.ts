import {
  CompleteRequestBody,
  CreateRequestBody,
  Id,
  RequestsQuery,
  ReviewRequestBody,
  type HelpRequest,
  type HelpRequestSummary,
  type RequestsResponse,
} from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser, requireVerifiedVolunteer } from "../../lib/identity";
import { parse } from "../../lib/validate";
import {
  acceptRequest,
  cancelRequest,
  completeRequest,
  confirmRequest,
  createRequest,
  listByStatus,
  listMine,
  reviewRequest,
  viewRequest,
  withdrawRequest,
} from "./service";

export const requestRoutes: Route[] = [
  {
    method: "POST",
    path: "/api/requests",
    handler: async (req) => {
      const elder = await requireUser(req, "elder");
      const body = parse(CreateRequestBody, req.body);
      return ok((await createRequest(elder, body)) satisfies HelpRequest, 201);
    },
  },
  {
    method: "GET",
    path: "/api/requests/mine",
    handler: async (req) => {
      const user = await requireUser(req);
      return ok({ requests: await listMine(user) } satisfies RequestsResponse);
    },
  },
  {
    method: "GET",
    path: "/api/requests",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const { status = "pending_review" } = parse(RequestsQuery, req.query);
      return ok({ requests: await listByStatus(status) } satisfies RequestsResponse);
    },
  },
  {
    method: "GET",
    path: "/api/requests/{id}",
    handler: async (req) => {
      const user = await requireUser(req);
      const id = parse(Id, req.params.id);
      return ok((await viewRequest(user, id)) satisfies HelpRequest | HelpRequestSummary);
    },
  },
  {
    method: "POST",
    path: "/api/requests/{id}/review",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const id = parse(Id, req.params.id);
      const body = parse(ReviewRequestBody, req.body);
      return ok((await reviewRequest(id, body)) satisfies HelpRequest);
    },
  },
  {
    method: "POST",
    path: "/api/requests/{id}/cancel",
    handler: async (req) => {
      const elder = await requireUser(req, "elder");
      const id = parse(Id, req.params.id);
      return ok((await cancelRequest(elder, id)) satisfies HelpRequest);
    },
  },
  {
    method: "POST",
    path: "/api/requests/{id}/accept",
    handler: async (req) => {
      const volunteer = await requireVerifiedVolunteer(req);
      const id = parse(Id, req.params.id);
      return ok((await acceptRequest(volunteer, id)) satisfies HelpRequest);
    },
  },
  {
    method: "POST",
    path: "/api/requests/{id}/withdraw",
    handler: async (req) => {
      const volunteer = await requireUser(req, "volunteer");
      const id = parse(Id, req.params.id);
      return ok((await withdrawRequest(volunteer, id)) satisfies HelpRequestSummary);
    },
  },
  {
    method: "POST",
    path: "/api/requests/{id}/complete",
    handler: async (req) => {
      const volunteer = await requireUser(req, "volunteer");
      const id = parse(Id, req.params.id);
      const body = parse(CompleteRequestBody, req.body);
      return ok((await completeRequest(volunteer, id, body)) satisfies HelpRequest);
    },
  },
  {
    method: "POST",
    path: "/api/requests/{id}/confirm",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "coordinator");
      const id = parse(Id, req.params.id);
      return ok((await confirmRequest(user, id)) satisfies HelpRequest);
    },
  },
];
