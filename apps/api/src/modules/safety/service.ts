import { randomUUID } from "node:crypto";
import type {
  CreateFacilityReportBody,
  FacilityReport,
  PatchFacilityReportBody,
  PutSafetyReadingBody,
  SafetyReading,
  SafetyResponse,
} from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { nowIso, toUtc } from "../../lib/time";
import {
  FACILITY_REPORT_LIMIT,
  getFacility,
  listFacilities,
  listReadings,
  putFacility,
  putReading,
} from "./repository";

export async function saveReading(body: PutSafetyReadingBody): Promise<SafetyReading> {
  const reading: SafetyReading = { ...body, measuredAt: toUtc(body.measuredAt) };
  await putReading(reading);
  return reading;
}

export async function loadSafety(): Promise<SafetyResponse> {
  const [readings, facilityReports] = await Promise.all([
    listReadings(),
    listFacilities(FACILITY_REPORT_LIMIT),
  ]);
  return { readings, facilityReports };
}

export async function createFacilityReport(
  body: CreateFacilityReportBody,
): Promise<FacilityReport> {
  const now = nowIso();
  const report: FacilityReport = {
    id: randomUUID(),
    title: body.title,
    area: body.area,
    category: body.category,
    status: "reported",
    description: body.description,
    reportedAt: now,
    updatedAt: now,
  };
  await putFacility(report, false);
  return report;
}

export async function patchFacilityReport(
  id: string,
  patch: PatchFacilityReportBody,
): Promise<FacilityReport> {
  const current = await getFacility(id);
  if (!current) throw new HttpError("NOT_FOUND", "Facility report not found");
  const next: FacilityReport = { ...current, ...patch, updatedAt: nowIso() };
  await putFacility(next, true);
  return next;
}
