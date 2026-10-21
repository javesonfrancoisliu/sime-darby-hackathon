import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { db, isConditionFailure, table } from "../../lib/db";

// One saved Claude answer per volunteer and opportunity, reused until the inputs change.
export interface StoredAnswer {
  // Hash of everything the answer was based on; a different hash means the answer is out of date.
  inputHash: string;
  reason: string;
  explanationSource: "ai" | "rules";
  // 0 to 100, higher is a better fit; the feed orders by it so the order never shifts.
  fit: number;
  model: string;
  createdAt: string;
}

export interface AnswerStore {
  list(volunteerId: string): Promise<Map<string, StoredAnswer>>;
  save(volunteerId: string, opportunityId: string, answer: StoredAnswer): Promise<void>;
}

const ENTITY = "AIANSWER";
const SORT_PREFIX = "OPP#";

const partition = (volunteerId: string) => `${ENTITY}#${volunteerId}`;

export const dynamoAnswerStore: AnswerStore = {
  async list(volunteerId) {
    const answers = new Map<string, StoredAnswer>();
    let start: Record<string, unknown> | undefined;
    do {
      const page = await db().send(
        new QueryCommand({
          TableName: table(),
          KeyConditionExpression: "PK = :pk",
          ExpressionAttributeValues: { ":pk": partition(volunteerId) },
          ExclusiveStartKey: start,
        }),
      );
      for (const item of page.Items ?? []) {
        answers.set(String(item.SK).slice(SORT_PREFIX.length), {
          inputHash: item.inputHash,
          reason: item.reason,
          explanationSource: item.explanationSource,
          fit: item.fit,
          model: item.model,
          createdAt: item.createdAt,
        });
      }
      start = page.LastEvaluatedKey;
    } while (start);
    return answers;
  },

  async save(volunteerId, opportunityId, answer) {
    try {
      await db().send(
        new PutCommand({
          TableName: table(),
          Item: {
            PK: partition(volunteerId),
            SK: `${SORT_PREFIX}${opportunityId}`,
            entity: ENTITY,
            ...answer,
          },
          // A stored answer is never overwritten unless the inputs changed.
          ConditionExpression: "attribute_not_exists(PK) OR inputHash <> :hash",
          ExpressionAttributeValues: { ":hash": answer.inputHash },
        }),
      );
    } catch (error) {
      if (!isConditionFailure(error)) throw error;
    }
  },
};

// For tests and local use without a table.
export function createMemoryAnswerStore(): AnswerStore & { size: () => number } {
  const items = new Map<string, Map<string, StoredAnswer>>();
  return {
    async list(volunteerId) {
      return new Map(items.get(volunteerId) ?? []);
    },
    async save(volunteerId, opportunityId, answer) {
      const mine = items.get(volunteerId) ?? new Map<string, StoredAnswer>();
      const current = mine.get(opportunityId);
      if (!current || current.inputHash !== answer.inputHash) mine.set(opportunityId, answer);
      items.set(volunteerId, mine);
    },
    size: () => [...items.values()].reduce((total, mine) => total + mine.size, 0),
  };
}
