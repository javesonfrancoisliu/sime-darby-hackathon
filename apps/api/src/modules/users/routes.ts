import {
  CreateMeBody,
  CreateUserBody,
  DemoUsersQuery,
  Id,
  PutMedicalIdBody,
  PutSettingsBody,
  ReviewVolunteerBody,
  UpdateMeBody,
  VolunteersQuery,
  type DemoUsersResponse,
  type MedicalId,
  type Settings,
  type User,
  type VolunteersResponse,
} from "@sdh/contracts";
import { HttpError, ok, type Route } from "../../lib/http";
import { requireDemoAuthEnabled, requireToken, requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import {
  createMyProfile,
  createUser,
  listDemoUsers,
  listVolunteers,
  readMedicalId,
  readSettings,
  removeMedicalId,
  reviewVolunteer,
  saveMedicalId,
  saveSettings,
  updateMe,
} from "./service";

export const userRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/demo/users",
    handler: async (req) => {
      requireDemoAuthEnabled();
      const { role } = parse(DemoUsersQuery, req.query);
      return ok({ users: await listDemoUsers(role) } satisfies DemoUsersResponse);
    },
  },
  {
    method: "POST",
    path: "/api/users",
    handler: async (req) => {
      requireDemoAuthEnabled();
      const body = parse(CreateUserBody, req.body);
      // Coordinators are never created from a request.
      if (body.role === "coordinator") {
        throw new HttpError("FORBIDDEN", "Coordinator accounts cannot be created here");
      }
      return ok((await createUser(body)) satisfies User, 201);
    },
  },
  {
    method: "POST",
    path: "/api/me",
    handler: async (req) => {
      const { sub } = await requireToken(req);
      const body = parse(CreateMeBody, req.body);
      return ok((await createMyProfile(sub, body)) satisfies User, 201);
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
  {
    method: "GET",
    path: "/api/me/medical-id",
    handler: async (req) => {
      const elder = await requireUser(req, "elder");
      return ok((await readMedicalId(elder)) satisfies MedicalId);
    },
  },
  {
    method: "PUT",
    path: "/api/me/medical-id",
    handler: async (req) => {
      const elder = await requireUser(req, "elder");
      const body = parse(PutMedicalIdBody, req.body);
      return ok((await saveMedicalId(elder, body)) satisfies MedicalId);
    },
  },
  {
    method: "DELETE",
    path: "/api/me/medical-id",
    handler: async (req) => {
      const elder = await requireUser(req, "elder");
      await removeMedicalId(elder);
      return { status: 204, body: undefined };
    },
  },
  {
    method: "GET",
    path: "/api/me/settings",
    handler: async (req) => ok((await readSettings(await requireUser(req))) satisfies Settings),
  },
  {
    method: "PUT",
    path: "/api/me/settings",
    handler: async (req) => {
      const user = await requireUser(req);
      const body = parse(PutSettingsBody, req.body);
      return ok((await saveSettings(user, body)) satisfies Settings);
    },
  },
];
