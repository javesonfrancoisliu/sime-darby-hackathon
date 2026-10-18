import {
  CreateUserBody,
  DemoUsersQuery,
  Id,
  ReviewVolunteerBody,
  UpdateMeBody,
  VolunteersQuery,
  type DemoUsersResponse,
  type User,
  type VolunteersResponse,
} from "@sdh/contracts";
import { config } from "../../lib/config";
import { HttpError, ok, type Route } from "../../lib/http";
import { requireDemoIdentity, requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { createUser, listDemoUsers, listVolunteers, reviewVolunteer, updateMe } from "./service";

export const userRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/demo/users",
    handler: async (req) => {
      requireDemoIdentity();
      const { role } = parse(DemoUsersQuery, req.query);
      return ok({ users: await listDemoUsers(role) } satisfies DemoUsersResponse);
    },
  },
  {
    method: "POST",
    path: "/api/users",
    handler: async (req) => {
      const body = parse(CreateUserBody, req.body);
      // With demo sign-in off, nobody can self-create a coordinator.
      if (body.role === "coordinator" && !config.allowDemoIdentity) {
        throw new HttpError("FORBIDDEN", "Coordinators cannot be created here");
      }
      return ok((await createUser(body)) satisfies User, 201);
    },
  },
  {
    method: "GET",
    path: "/api/me",
    handler: async (req) => ok((await requireUser(req)) satisfies User),
  },
  {
    method: "PATCH",
    path: "/api/me",
    handler: async (req) => {
      const user = await requireUser(req);
      return ok((await updateMe(user, parse(UpdateMeBody, req.body))) satisfies User);
    },
  },
  {
    method: "GET",
    path: "/api/volunteers",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const { verification } = parse(VolunteersQuery, req.query);
      return ok({ volunteers: await listVolunteers(verification) } satisfies VolunteersResponse);
    },
  },
  {
    method: "POST",
    path: "/api/volunteers/{id}/review",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const id = parse(Id, req.params.id);
      const { decision } = parse(ReviewVolunteerBody, req.body);
      return ok((await reviewVolunteer(id, decision)) satisfies User);
    },
  },
];
