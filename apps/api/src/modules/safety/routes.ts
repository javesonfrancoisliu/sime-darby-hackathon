import {
  CreateFacilityReportBody,
  Id,
  PatchFacilityReportBody,
  PutSafetyReadingBody,
  type FacilityReport,
  type SafetyReading,
  type SafetyResponse,
} from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { createFacilityReport, loadSafety, patchFacilityReport, saveReading } from "./service";

export const safetyRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/safety",
    handler: async (req) => {
      await requireUser(req);
      return ok((await loadSafety()) satisfies SafetyResponse);
    },
  },
  {
    method: "PUT",
    path: "/api/safety/readings",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const body = parse(PutSafetyReadingBody, req.body);
      return ok((await saveReading(body)) satisfies SafetyReading);
    },
  },
  {
    method: "POST",
    path: "/api/facility-reports",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const body = parse(CreateFacilityReportBody, req.body);
      return ok((await createFacilityReport(body)) satisfies FacilityReport, 201);
    },
  },
  {
    method: "PATCH",
    path: "/api/facility-reports/{id}",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const id = parse(Id, req.params.id);
      const body = parse(PatchFacilityReportBody, req.body);
      return ok((await patchFacilityReport(id, body)) satisfies FacilityReport);
    },
  },
];
