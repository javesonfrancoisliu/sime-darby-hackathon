import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { Contribution } from "@sdh/contracts";
import { db, fromItem, table } from "../../lib/db";

const ENTITY = "CONTRIBUTION";

const toContribution = (item: Record<string, unknown>) => fromItem<Contribution>(item);

// Transaction entry so a contribution is recorded atomically with the request or event that earned it.
export function contributionPut(contribution: Contribution) {
  return {
    Put: {
      TableName: table(),
      Item: {
        PK: `USER#${contribution.volunteerId}`,
        SK: `CONTRIB#${contribution.completedAt}#${contribution.id}`,
        entity: ENTITY,
        ...contribution,
      },
      ConditionExpression: "attribute_not_exists(PK)",
    },
  };
}

export async function listContributions(volunteerId: string): Promise<Contribution[]> {
  const items: Contribution[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: { ":pk": `USER#${volunteerId}`, ":prefix": "CONTRIB#" },
        ScanIndexForward: false,
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...(result.Items ?? []).map(toContribution));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return items;
}
