import { randomUUID } from "node:crypto";
import type {
  AssignedHelpRequest,
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
import { approxKm, approxPlace, distanceKm } from "../../lib/geo";
import { HttpError } from "../../lib/http";
import { nowIso } from "../../lib/time";
import { newContribution } from "../contributions/service";
import { getSettings, getUser } from "../users/repository";
import { VOLUNTEERING_POINTS, awardOnce } from "../points/service";
import {
  backfillConfirmedAt,
  acceptWithSlot,
  completeWithContribution,
  confirmItem,
  getRequest,
  leaveMatched,
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

// Names are copied into a request when it is made or accepted, so they go stale after a profile
// rename. Looking them up when a request is returned keeps every screen current.
export async function withCurrentNames(requests: HelpRequest[]): Promise<HelpRequest[]> {
  const ids = new Set<string>();
  for (const r of requests) {
    ids.add(r.elderId);
    if (r.volunteerId) ids.add(r.volunteerId);
  }
  const names = new Map<string, string>();
  await Promise.all(
    [...ids].map(async (id) => {
      const user = await getUser(id);
      if (user) names.set(id, user.name);
    }),
  );
  return requests.map((r) => ({
    ...r,
    elderName: names.get(r.elderId) ?? r.elderName,
    ...(r.volunteerId ? { volunteerName: names.get(r.volunteerId) ?? r.volunteerName } : {}),
  }));
}

const withCurrentName = async (request: HelpRequest): Promise<HelpRequest> =>
  (await withCurrentNames([request]))[0] as HelpRequest;

// The assigned volunteer never gets the elder id, and gets only an approximate place when the elder
// opted in with shareApproxLocation.
export async function toAssigned(requests: HelpRequest[]): Promise<AssignedHelpRequest[]> {
  const approx = new Map<string, boolean>();
  await Promise.all(
    [...new Set(requests.map((r) => r.elderId))].map(async (id) => {
      approx.set(id, (await getSettings(id))?.shareApproxLocation === true);
    }),
  );
  return requests.map(({ elderId, ...rest }) => ({
    ...rest,
    location: approx.get(elderId) ? approxPlace(rest.location) : rest.location,
  }));
}

const toAssignedOne = async (request: HelpRequest): Promise<AssignedHelpRequest> =>
  (await toAssigned([request]))[0] as AssignedHelpRequest;

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

// Elder profile locations are precinct centres, so a few kilometres covers every honest request.
const MAX_HOME_DISTANCE_KM = 5;

export async function createRequest(elder: User, body: CreateRequestBody): Promise<HelpRequest> {
  if (Date.parse(body.scheduledAt) <= Date.now()) {
    throw new HttpError("VALIDATION_FAILED", "scheduledAt: must be in the future");
  }
  // The request must be at the elder's own registered home; a made-up place would let an elder
  // probe where volunteers live through the matches route.
  if (distanceKm(elder.location, body.location) > MAX_HOME_DISTANCE_KM) {
    throw new HttpError("VALIDATION_FAILED", "location: must be your registered home area");
  }
  const now = new Date().toISOString();
  const request: HelpRequest = {
    ...body,
    id: randomUUID(),
    elderId: elder.id,
    elderName: elder.name,
    // No coordinator queue: a new request is visible to volunteers straight away.
    status: "open",
    createdAt: now,
    updatedAt: now,
  };
  await putRequest(request);
  return request;
}

export async function listMine(user: User): Promise<AssignedHelpRequest[]> {
  if (user.role === "elder") return withCurrentNames(await listRequestsByElder(user.id));
  if (user.role === "volunteer") {
    return toAssigned(await withCurrentNames(await listRequestsByVolunteer(user.id)));
  }
  throw new HttpError("FORBIDDEN", "Not allowed for your role");
}

export const listByStatus = async (status: RequestStatus) =>
  withCurrentNames(await listRequestsByStatus(status));

// Involved parties get the full request; other verified volunteers see a shaped summary only while open.
export async function viewRequest(
  user: User,
  id: string,
): Promise<HelpRequest | AssignedHelpRequest | HelpRequestSummary> {
  const request = await loadOrThrow(id);
  if (user.role === "coordinator") return withCurrentName(request);
  if (user.role === "elder" && request.elderId === user.id) return withCurrentName(request);
  if (user.role === "volunteer") {
    if (request.volunteerId === user.id) return toAssignedOne(await withCurrentName(request));
    if (request.status === "open" && user.verification === "verified") {
      return toSummary(request, user.location);
    }
  }
  throw notFound();
}

export async function reviewRequest(id: string, body: ReviewRequestBody): Promise<HelpRequest> {
  const request = await loadOrThrow(id);
  return guarded("Request was already reviewed", async () =>
    withCurrentName(
      await transitionRequest(
        request,
        { from: "pending_review" },
        {
          status: body.decision === "approved" ? "open" : "rejected",
          reviewNote: body.note,
          updatedAt: new Date().toISOString(),
        },
      ),
    ),
  );
}

export async function cancelRequest(elder: User, id: string): Promise<HelpRequest> {
  const request = await loadOrThrow(id);
  if (request.elderId !== elder.id) throw notFound();
  const cancellable =
    request.status === "pending_review" ||
    request.status === "open" ||
    request.status === "matched";
  if (!cancellable) throw new HttpError("CONFLICT", "Request can no longer be cancelled");
  const changes = { status: "cancelled", updatedAt: new Date().toISOString() } as const;
  return guarded("Request can no longer be cancelled", async () =>
    withCurrentName(
      request.status === "matched" && request.volunteerId
        ? await leaveMatched(request, request.volunteerId, changes)
        : await transitionRequest(request, { from: request.status }, changes),
    ),
  );
}

// Fields a withdrawing volunteer leaves behind; the GSI3 keys go too so the request leaves their list.
const ASSIGNMENT_FIELDS = ["volunteerId", "volunteerName", "acceptedAt", "GSI3PK", "GSI3SK"];

// The accepted volunteer backs out; the request goes back to the open pool.
export async function withdrawRequest(volunteer: User, id: string): Promise<HelpRequestSummary> {
  const request = await loadOrThrow(id);
  if (request.volunteerId !== volunteer.id) throw notFound();
  if (request.status !== "matched") {
    throw new HttpError("CONFLICT", "Request can no longer be withdrawn from");
  }
  const reopened = await guarded("Request can no longer be withdrawn from", () =>
    leaveMatched(request, volunteer.id, { status: "open", updatedAt: nowIso() }, ASSIGNMENT_FIELDS),
  );
  return toSummary(reopened, volunteer.location);
}

// A rejected volunteer keeps no matched requests; each goes back to the open pool.
export async function releaseVolunteerRequests(volunteerId: string): Promise<void> {
  for (const request of await listRequestsByVolunteer(volunteerId)) {
    if (request.status !== "matched") continue;
    try {
      await leaveMatched(
        request,
        volunteerId,
        { status: "open", updatedAt: nowIso() },
        ASSIGNMENT_FIELDS,
      );
    } catch (error) {
      // Lost a race with a withdraw, cancel or complete; the request already left matched.
      if (!isConditionFailure(error)) throw error;
    }
  }
}

export async function acceptRequest(volunteer: User, id: string): Promise<AssignedHelpRequest> {
  const request = await loadOrThrow(id);
  // Rows matched before slot locks existed have no lock, so the list check still guards them.
  const slot = Date.parse(request.scheduledAt);
  const taken = (await listRequestsByVolunteer(volunteer.id)).some(
    (r) => r.status === "matched" && r.id !== id && Date.parse(r.scheduledAt) === slot,
  );
  if (taken) throw new HttpError("CONFLICT", "You already have a request at this time");
  const now = nowIso();
  const outcome = await acceptWithSlot(request, volunteer.id, {
    status: "matched",
    volunteerId: volunteer.id,
    volunteerName: volunteer.name,
    acceptedAt: now,
    updatedAt: now,
  });
  if (outcome === "conflict") throw new HttpError("CONFLICT_RETRY", "Try again in a moment");
  if (outcome === "taken") throw new HttpError("CONFLICT", "Request was already taken");
  if (outcome === "slot_taken") {
    throw new HttpError("CONFLICT", "You already have a request at this time");
  }
  return toAssignedOne(await withCurrentName(await loadOrThrow(id)));
}

export async function completeRequest(
  volunteer: User,
  id: string,
  body: CompleteRequestBody,
): Promise<AssignedHelpRequest> {
  const request = await loadOrThrow(id);
  if (request.volunteerId !== volunteer.id) throw notFound();
  if (Date.parse(request.scheduledAt) > Date.now()) {
    throw new HttpError("CONFLICT", "Request has not started yet");
  }
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
  return toAssignedOne(await withCurrentName({ ...request, ...changes }));
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
  if ((await getUser(request.volunteerId))?.verification === "rejected") {
    throw new HttpError("CONFLICT", "This volunteer can no longer be credited");
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
  return withCurrentName(await loadOrThrow(id));
}
