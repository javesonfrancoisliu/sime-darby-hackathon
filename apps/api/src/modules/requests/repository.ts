import {
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { Contribution, HelpRequest, RequestStatus } from "@sdh/contracts";
import { db, fromItem, table } from "../../lib/db";
import { contributionPut } from "../contributions/repository";

const ENTITY = "REQUEST";

const key = (id: string) => ({ PK: `REQUEST#${id}`, SK: "META" });
const statusKey = (status: RequestStatus) => `REQSTATUS#${status}`;
const volunteerKeys = (volunteerId: string, scheduledAt: string) => ({
  GSI3PK: `VOLUNTEER#${volunteerId}`,
  GSI3SK: scheduledAt,
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

function updateParams(request: HelpRequest, guard: Guard, changes: Changes) {
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
  let condition = "#status = :from";
  if (guard.volunteerId) {
    names["#volunteerId"] = "volunteerId";
    values[":guardVolunteer"] = guard.volunteerId;
    condition += " AND #volunteerId = :guardVolunteer";
  }
  return {
    TableName: table(),
    Key: key(request.id),
    UpdateExpression: `SET ${sets.join(", ")}`,
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
export async function transitionRequest(
  request: HelpRequest,
  guard: Guard,
  changes: Changes,
): Promise<HelpRequest> {
  const result = await db().send(
    new UpdateCommand({ ...updateParams(request, guard, changes), ReturnValues: "ALL_NEW" }),
  );
  return toRequest(result.Attributes ?? {});
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
      ],
    }),
  );
}
