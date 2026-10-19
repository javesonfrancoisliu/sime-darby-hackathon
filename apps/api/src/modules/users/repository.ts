import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  MedicalId,
  PutMedicalIdBody,
  PutSettingsBody,
  Role,
  Settings,
  UpdateMeBody,
  User,
  Verification,
} from "@sdh/contracts";
import { db, fromItem, table } from "../../lib/db";

const ENTITY = "USER";

const key = (id: string) => ({ PK: `USER#${id}`, SK: "PROFILE" });
const byRoleKeys = (user: Pick<User, "role" | "verification" | "createdAt">) => ({
  GSI1PK: `ROLE#${user.role}`,
  GSI1SK: `${user.verification}#${user.createdAt}`,
});

// Older items predate the points and preference fields; defaults are applied on read.
const toUser = (item: Record<string, unknown>): User => {
  const user = fromItem<User>(item);
  return {
    ...user,
    points: user.points ?? 0,
    lifetimePoints: user.lifetimePoints ?? 0,
    interests: user.interests ?? [],
    languages: user.languages ?? [],
    leaderboardOptIn: user.leaderboardOptIn ?? false,
  };
};

export async function putUser(user: User): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { ...key(user.id), ...byRoleKeys(user), entity: ENTITY, ...user },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function getUser(id: string): Promise<User | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: key(id) }));
  return result.Item ? toUser(result.Item) : undefined;
}

export async function listUsersByRole(role: Role, verification?: Verification): Promise<User[]> {
  const users: User[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI1",
        KeyConditionExpression: verification
          ? "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)"
          : "GSI1PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `ROLE#${role}`,
          ...(verification ? { ":prefix": `${verification}#` } : {}),
        },
        ExclusiveStartKey: startKey,
      }),
    );
    users.push(...(result.Items ?? []).map(toUser));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return users;
}

export async function updateProfile(
  id: string,
  changes: UpdateMeBody,
  updatedAt: string,
): Promise<User> {
  const fields = { ...changes, updatedAt };
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const sets = Object.entries(fields).map(([field, value], index) => {
    names[`#f${index}`] = field;
    values[`:v${index}`] = value;
    return `#f${index} = :v${index}`;
  });
  const result = await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: key(id),
      UpdateExpression: `SET ${sets.join(", ")}`,
      ConditionExpression: "attribute_exists(PK)",
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }),
  );
  return toUser(result.Attributes ?? {});
}

// Conditional on the status the caller read, so two coordinators cannot overwrite each other silently.
export async function setVerification(
  user: User,
  verification: Verification,
  updatedAt: string,
): Promise<User> {
  const result = await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: key(user.id),
      UpdateExpression: "SET verification = :next, GSI1SK = :gsi1sk, updatedAt = :updatedAt",
      ConditionExpression: "verification = :current AND #role = :volunteer",
      ExpressionAttributeNames: { "#role": "role" },
      ExpressionAttributeValues: {
        ":next": verification,
        ":current": user.verification,
        ":volunteer": "volunteer",
        ":gsi1sk": byRoleKeys({ ...user, verification }).GSI1SK,
        ":updatedAt": updatedAt,
      },
      ReturnValues: "ALL_NEW",
    }),
  );
  return toUser(result.Attributes ?? {});
}

// Medical and settings items live under the owner's partition with no GSI attributes, so no
// index can ever surface them; they are only reachable by the owner's exact key.
const medicalKey = (userId: string) => ({ PK: `USER#${userId}`, SK: "MEDICAL" });
const settingsKey = (userId: string) => ({ PK: `USER#${userId}`, SK: "SETTINGS" });

export async function getMedicalId(userId: string): Promise<MedicalId | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: medicalKey(userId) }));
  const item = result.Item;
  if (!item) return undefined;
  return {
    bloodGroup: item.bloodGroup,
    nextOfKinName: item.nextOfKinName,
    nextOfKinRelation: item.nextOfKinRelation,
    nextOfKinPhone: item.nextOfKinPhone,
    updatedAt: item.updatedAt,
  };
}

export async function putMedicalId(
  userId: string,
  body: PutMedicalIdBody,
  updatedAt: string,
): Promise<MedicalId> {
  const medical: MedicalId = {
    bloodGroup: body.bloodGroup,
    nextOfKinName: body.nextOfKinName,
    nextOfKinRelation: body.nextOfKinRelation,
    nextOfKinPhone: body.nextOfKinPhone,
    updatedAt,
  };
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { ...medicalKey(userId), entity: "MEDICAL", ...medical },
    }),
  );
  return medical;
}

export async function deleteMedicalId(userId: string): Promise<void> {
  await db().send(new DeleteCommand({ TableName: table(), Key: medicalKey(userId) }));
}

export async function getSettings(userId: string): Promise<Settings | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: settingsKey(userId) }));
  const item = result.Item;
  if (!item) return undefined;
  return {
    notifyEvents: item.notifyEvents,
    notifyVolunteering: item.notifyVolunteering,
    shareApproxLocation: item.shareApproxLocation,
    fontSize: item.fontSize,
    highContrast: item.highContrast,
    reducedMotion: item.reducedMotion,
    voiceAssist: item.voiceAssist,
    updatedAt: item.updatedAt,
  };
}

export async function putSettings(
  userId: string,
  body: PutSettingsBody,
  updatedAt: string,
): Promise<Settings> {
  const settings: Settings = {
    notifyEvents: body.notifyEvents,
    notifyVolunteering: body.notifyVolunteering,
    shareApproxLocation: body.shareApproxLocation,
    fontSize: body.fontSize,
    highContrast: body.highContrast,
    reducedMotion: body.reducedMotion,
    voiceAssist: body.voiceAssist,
    updatedAt,
  };
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { ...settingsKey(userId), entity: "SETTINGS", ...settings },
    }),
  );
  return settings;
}
