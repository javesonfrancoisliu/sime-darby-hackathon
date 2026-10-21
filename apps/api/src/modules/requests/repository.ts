import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Contribution, HelpRequest, RequestStatus } from "@sdh/contracts";
import { db, fromItem, isConditionFailure, table, transact, type TransactItem } from "../../lib/db";
import { contributionPut } from "../contributions/repository";

const ENTITY = "REQUEST";

const key = (id: string) => ({ PK: `REQUEST#${id}`, SK: "META" });
const statusKey = (status: RequestStatus) => `REQSTATUS#${status}`;
const volunteerKeys = (volunteerId: string, scheduledAt: string) => ({
  GSI3PK: `VOLUNTEER#${volunteerId}`,
  GSI3SK: scheduledAt,
});

// One lock item per volunteer and start instant: accept takes it and every exit from matched
// drops it, so two simultaneous accepts for the same slot cannot both win.
const slotKey = (volunteerId: string, scheduledAt: string) => ({
  PK: `VSLOT#${volunteerId}`,
  SK: new Date(scheduledAt).toISOString(),
});

const slotRelease = (volunteerId: string, scheduledAt: string): TransactItem => ({
  Delete: { TableName: table(), Key: slotKey(volunteerId, scheduledAt) },
});

const toRequest = (item: Record<string, unknown>) => fromItem<HelpRequest>(item);

// Fields a transition may change; GSI keys are derived so the indexes cannot drift from status.
type Changes = Partial<
  Pick<
    HelpRequest,
    | "status"
    | "volunteerId"
    | "volunteerName"
    | "reviewNote"
    | "minutesSpent"
    | "acceptedAt"
    | "completedAt"
    | "updatedAt"
  >
>;

interface Guard {
  from: RequestStatus;
  volunteerId?: string;
}

function updateParams(request: HelpRequest, guard: Guard, changes: Changes, unset: string[] = []) {
  const fields: Record<string, unknown> = { ...changes };
  if (changes.status) fields.GSI1PK = statusKey(changes.status);
  if (changes.volunteerId) {
    Object.assign(fields, volunteerKeys(changes.volunteerId, request.scheduledAt));
  }
  const names: Record<string, string> = { "#status": "status" };
  const values: Record<string, unknown> = { ":from": guard.from };
  const sets: string[] = [];
  Object.entries(fields).forEach(([field, value], index) => {
    if (value === undefined) return;
    names[`#f${index}`] = field;
    values[`:v${index}`] = value;
    sets.push(`#f${index} = :v${index}`);
  });
  const removes = unset.map((field, index) => {
    names[`#r${index}`] = field;
    return `#r${index}`;
  });
  let condition = "#status = :from";
  if (guard.volunteerId) {
    names["#volunteerId"] = "volunteerId";
    values[":guardVolunteer"] = guard.volunteerId;
    condition += " AND #volunteerId = :guardVolunteer";
  }
  return {
    TableName: table(),
    Key: key(request.id),
    UpdateExpression: `SET ${sets.join(", ")}${removes.length > 0 ? ` REMOVE ${removes.join(", ")}` : ""}`,
    ConditionExpression: condition,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
}

export async function putRequest(request: HelpRequest): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: {
        ...key(request.id),
        GSI1PK: statusKey(request.status),
        GSI1SK: request.scheduledAt,
        GSI2PK: `ELDER#${request.elderId}`,
        GSI2SK: request.createdAt,
        entity: ENTITY,
        ...request,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function getRequest(id: string): Promise<HelpRequest | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: key(id) }));
  return result.Item ? toRequest(result.Item) : undefined;
}

async function queryIndex(
  indexName: string,
  partition: string,
  newestFirst: boolean,
): Promise<HelpRequest[]> {
  const requests: HelpRequest[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: indexName,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": `${indexName}PK` },
        ExpressionAttributeValues: { ":pk": partition },
        ScanIndexForward: !newestFirst,
        ExclusiveStartKey: startKey,
      }),
    );
    requests.push(...(result.Items ?? []).map(toRequest));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return requests;
}

// Soonest first.
export const listRequestsByStatus = (status: RequestStatus) =>
  queryIndex("GSI1", statusKey(status), false);

// Newest first.
export const listRequestsByElder = (elderId: string) =>
  queryIndex("GSI2", `ELDER#${elderId}`, true);

// Soonest first.
export const listRequestsByVolunteer = (volunteerId: string) =>
  queryIndex("GSI3", `VOLUNTEER#${volunteerId}`, false);

// Conditional on the status the caller read; throws a condition failure when it lost a race.
// `unset` lists attributes to remove in the same write.
export async function transitionRequest(
  request: HelpRequest,
  guard: Guard,
  changes: Changes,
  unset: string[] = [],
): Promise<HelpRequest> {
  const result = await db().send(
    new UpdateCommand({
      ...updateParams(request, guard, changes, unset),
      ReturnValues: "ALL_NEW",
    }),
  );
  return toRequest(result.Attributes ?? {});
}

export type AcceptOutcome = "accepted" | "taken" | "slot_taken" | "conflict";

// Matches the request and takes the volunteer's slot lock in one atomic write.
export async function acceptWithSlot(
  request: HelpRequest,
  volunteerId: string,
  changes: Changes,
): Promise<AcceptOutcome> {
  const result = await transact([
    { Update: updateParams(request, { from: "open" }, changes) },
    {
      Put: {
        TableName: table(),
        Item: {
          ...slotKey(volunteerId, request.scheduledAt),
          entity: "VOLUNTEER_SLOT",
          requestId: request.id,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      },
    },
  ]);
  if (result.ok) return "accepted";
  if (result.conflict) return "conflict";
  if (result.reasons[0] === "ConditionalCheckFailed") return "taken";
  if (result.reasons[1] === "ConditionalCheckFailed") return "slot_taken";
  throw new Error("Accept was cancelled for an unexpected reason");
}

// Moves a matched request on and drops its volunteer's slot lock in one atomic write; throws a
// condition failure when it lost a race.
export async function leaveMatched(
  request: HelpRequest,
  volunteerId: string,
  changes: Changes,
  unset: string[] = [],
): Promise<HelpRequest> {
  await db().send(
    new TransactWriteCommand({
      TransactItems: [
        { Update: updateParams(request, { from: "matched", volunteerId }, changes, unset) },
        slotRelease(volunteerId, request.scheduledAt),
      ],
    }),
  );
  const saved = await getRequest(request.id);
  if (!saved) throw new Error("Request disappeared after a transition");
  return saved;
}

// Completes the request and records the volunteer's contribution in one atomic write.
export async function completeWithContribution(
  request: HelpRequest,
  volunteerId: string,
  changes: Changes,
  contribution: Contribution,
): Promise<void> {
  await db().send(
    new TransactWriteCommand({
      TransactItems: [
        { Update: updateParams(request, { from: "matched", volunteerId }, changes) },
        contributionPut(contribution),
        slotRelease(volunteerId, request.scheduledAt),
      ],
    }),
  );
}

// Extra item for the confirm transaction. Orders after the award items, so its failure is
// reported as "rejected". Without callerElderId (coordinator) the owner condition is dropped.
export function confirmItem(
  requestId: string,
  confirmedAt: string,
  callerElderId?: string,
): TransactItem {
  const owner = callerElderId ? "elderId = :caller AND " : "";
  return {
    Update: {
      TableName: table(),
      Key: key(requestId),
      UpdateExpression: "SET confirmedAt = :at, updatedAt = :at",
      ConditionExpression: `${owner}#status = :completed AND attribute_not_exists(confirmedAt) AND attribute_exists(volunteerId)`,
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":at": confirmedAt,
        ":completed": "completed",
        ...(callerElderId ? { ":caller": callerElderId } : {}),
      },
    },
  };
}

// Backfills confirmedAt when the award already landed; a lost race is harmless.
export async function backfillConfirmedAt(requestId: string, confirmedAt: string): Promise<void> {
  try {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: key(requestId),
        UpdateExpression: "SET confirmedAt = :at, updatedAt = :at",
        ConditionExpression: "#status = :completed AND attribute_not_exists(confirmedAt)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":at": confirmedAt, ":completed": "completed" },
      }),
    );
  } catch (error) {
    if (!isConditionFailure(error)) throw error;
  }
}
