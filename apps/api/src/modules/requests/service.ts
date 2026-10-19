import { randomUUID } from "node:crypto";
import type {
  CompleteRequestBody,
  CreateRequestBody,
  HelpRequest,
  HelpRequestSummary,
  Location,
  RequestStatus,
  ReviewRequestBody,
  User,
} from "@sdh/contracts";
import { isConditionFailure } from "../../lib/db";
import { approxKm, distanceKm } from "../../lib/geo";
import { HttpError } from "../../lib/http";
import { nowIso } from "../../lib/time";
import { newContribution } from "../contributions/service";
import { VOLUNTEERING_POINTS, awardOnce } from "../points/service";
import {
  backfillConfirmedAt,
  completeWithContribution,
  confirmItem,
  getRequest,
  listRequestsByElder,
  listRequestsByStatus,
  listRequestsByVolunteer,
  putRequest,
  transitionRequest,
} from "./repository";

const notFound = () => new HttpError("NOT_FOUND", "Request not found");

// Volunteer hours may run over the planned duration, but not without limit.
const MAX_OVERRUN_FACTOR = 2;

// Maps a lost conditional write to 409 and lets anything else surface as a 500.
async function guarded<T>(conflictMessage: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isConditionFailure(error)) throw new HttpError("CONFLICT", conflictMessage);
    throw error;
  }
}

async function loadOrThrow(id: string): Promise<HelpRequest> {
  const request = await getRequest(id);
  if (!request) throw notFound();
  return request;
}

export function toSummary(request: HelpRequest, viewerLocation: Location): HelpRequestSummary {
  return {
    id: request.id,
    category: request.category,
    title: request.title,
    description: request.description,
    scheduledAt: request.scheduledAt,
    durationMinutes: request.durationMinutes,
    status: request.status,
    minutesSpent: request.minutesSpent,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    area: request.location.area,
    distanceKm: approxKm(distanceKm(viewerLocation, request.location)),
  };
}

export async function createRequest(elder: User, body: CreateRequestBody): Promise<HelpRequest> {
  if (Date.parse(body.scheduledAt) <= Date.now()) {
    throw new HttpError("VALIDATION_FAILED", "scheduledAt: must be in the future");
  }
  const now = new Date().toISOString();
  const request: HelpRequest = {
    ...body,
    id: randomUUID(),
    elderId: elder.id,
    elderName: elder.name,
    status: "pending_review",
    createdAt: now,
    updatedAt: now,
  };
  await putRequest(request);
  return request;
}

export async function listMine(user: User): Promise<HelpRequest[]> {
  if (user.role === "elder") return listRequestsByElder(user.id);
  if (user.role === "volunteer") return listRequestsByVolunteer(user.id);
  throw new HttpError("FORBIDDEN", "Not allowed for your role");
}

export const listByStatus = (status: RequestStatus) => listRequestsByStatus(status);

// Involved parties get the full request; other verified volunteers see a shaped summary only while open.
export async function viewRequest(
  user: User,
  id: string,
): Promise<HelpRequest | HelpRequestSummary> {
  const request = await loadOrThrow(id);
  if (user.role === "coordinator") return request;
  if (user.role === "elder" && request.elderId === user.id) return request;
  if (user.role === "volunteer") {
    if (request.volunteerId === user.id) return request;
    if (request.status === "open" && user.verification === "verified") {
      return toSummary(request, user.location);
    }
  }
  throw notFound();
}

export async function reviewRequest(id: string, body: ReviewRequestBody): Promise<HelpRequest> {
  const request = await loadOrThrow(id);
  return guarded("Request was already reviewed", () =>
    transitionRequest(
      request,
      { from: "pending_review" },
      {
        status: body.decision === "approved" ? "open" : "rejected",
        reviewNote: body.note,
        updatedAt: new Date().toISOString(),
      },
    ),
  );
}

export async function cancelRequest(elder: User, id: string): Promise<HelpRequest> {
  const request = await loadOrThrow(id);
  if (request.elderId !== elder.id) throw notFound();
  const cancellable = request.status === "pending_review" || request.status === "open";
  if (!cancellable) throw new HttpError("CONFLICT", "Request can no longer be cancelled");
  return guarded("Request can no longer be cancelled", () =>
    transitionRequest(
      request,
      { from: request.status },
      { status: "cancelled", updatedAt: new Date().toISOString() },
    ),
  );
}

export async function acceptRequest(volunteer: User, id: string): Promise<HelpRequest> {
  const request = await loadOrThrow(id);
  const now = nowIso();
  return guarded("Request was already taken", () =>
    transitionRequest(
      request,
      { from: "open" },
      {
        status: "matched",
        volunteerId: volunteer.id,
        volunteerName: volunteer.name,
        acceptedAt: now,
        updatedAt: now,
      },
    ),
  );
}

export async function completeRequest(
  volunteer: User,
  id: string,
  body: CompleteRequestBody,
): Promise<HelpRequest> {
  const request = await loadOrThrow(id);
  if (request.volunteerId !== volunteer.id) throw notFound();
  if (body.minutesSpent > request.durationMinutes * MAX_OVERRUN_FACTOR) {
    throw new HttpError(
      "VALIDATION_FAILED",
      `minutesSpent: at most ${request.durationMinutes * MAX_OVERRUN_FACTOR} for this request`,
    );
  }
  const now = nowIso();
  const changes = {
    status: "completed",
    minutesSpent: body.minutesSpent,
    completedAt: now,
    updatedAt: now,
  } as const;
  const contribution = newContribution({
    volunteerId: volunteer.id,
    source: "request",
    sourceId: id,
    title: request.title,
    minutes: body.minutesSpent,
  });
  await guarded("Request is not in progress", () =>
    completeWithContribution(request, volunteer.id, changes, contribution),
  );
  return { ...request, ...changes };
}

// Elder (owner) or coordinator confirms a completed request; the volunteer's points land in the
// same transaction as confirmedAt, so a request is confirmed if and only if it was paid.
export async function confirmRequest(user: User, id: string): Promise<HelpRequest> {
  const request = await loadOrThrow(id);
  const isElder = user.role === "elder";
  if (isElder && request.elderId !== user.id) throw notFound();
  if (request.confirmedAt) throw new HttpError("ALREADY_DONE", "Request is already confirmed");
  if (request.status !== "completed" || !request.volunteerId) {
    throw new HttpError("CONFLICT", "Request is not completed yet");
  }
  const now = nowIso();
  const outcome = await awardOnce(
    request.volunteerId,
    {
      awardKey: `volunteering:${id}`,
      sourceType: "volunteering",
      sourceId: id,
      points: VOLUNTEERING_POINTS,
      title: request.title,
    },
    [confirmItem(id, now, isElder ? user.id : undefined)],
  );
  if (outcome === "conflict") {
    throw new HttpError("CONFLICT_RETRY", "Try again in a moment");
  }
  if (outcome === "already_awarded") await backfillConfirmedAt(id, now);
  if (outcome === "rejected") {
    const latest = await loadOrThrow(id);
    if (latest.confirmedAt) throw new HttpError("ALREADY_DONE", "Request is already confirmed");
    if (latest.status !== "completed")
      throw new HttpError("CONFLICT", "Request is not completed yet");
    throw new Error("Confirm was rejected for an unexpected reason");
  }
  return loadOrThrow(id);
}
