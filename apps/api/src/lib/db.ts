import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { config } from "./config";
import { GSI_NAMES } from "./table-schema";

// DynamoDB Local accepts any credentials; these are only used when a local endpoint is set.
const LOCAL_CREDENTIALS = { accessKeyId: "local", secretAccessKey: "local" };
const LOCAL_REGION = "local";

interface Clients {
  endpoint: string | undefined;
  base: DynamoDBClient;
  doc: DynamoDBDocumentClient;
}

let clients: Clients | undefined;

function getClients(): Clients {
  const endpoint = config.dynamodbEndpoint;
  if (!clients || clients.endpoint !== endpoint) {
    const base = endpoint
      ? new DynamoDBClient({
          endpoint,
          region: process.env.AWS_REGION || LOCAL_REGION,
          credentials: LOCAL_CREDENTIALS,
        })
      : new DynamoDBClient({});
    const doc = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
    clients = { endpoint, base, doc };
  }
  return clients;
}

export const db = (): DynamoDBDocumentClient => getClients().doc;
export const baseClient = (): DynamoDBClient => getClients().base;
export const table = (): string => config.tableName;

const KEY_ATTRIBUTES = new Set([
  "PK",
  "SK",
  "entity",
  ...GSI_NAMES.flatMap((gsi) => [`${gsi}PK`, `${gsi}SK`]),
]);

// Strips storage keys so only the domain object leaves the repository.
export function fromItem<T>(item: Record<string, unknown>): T {
  return Object.fromEntries(
    Object.entries(item).filter(([attribute]) => !KEY_ATTRIBUTES.has(attribute)),
  ) as T;
}

// True when a write lost a race on its condition, alone or inside a transaction.
export function isConditionFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === "ConditionalCheckFailedException") return true;
  if (error.name !== "TransactionCanceledException") return false;
  const reasons = (error as { CancellationReasons?: { Code?: string }[] }).CancellationReasons;
  return reasons?.some((reason) => reason.Code === "ConditionalCheckFailed") ?? false;
}

export type TransactItem = NonNullable<TransactWriteCommandInput["TransactItems"]>[number];

export type TransactResult =
  | { ok: true }
  | {
      ok: false;
      // Cancellation code per item, in item order ("None" for items that did not fail).
      reasons: string[];
      // True when another transaction touched the same items; safe to retry (map to 409 CONFLICT_RETRY).
      conflict: boolean;
    };

const CONFLICT_CODE = "TransactionConflict";

// Runs items atomically; a cancelled transaction becomes a typed result, other errors still throw.
export async function transact(items: TransactItem[]): Promise<TransactResult> {
  try {
    await db().send(new TransactWriteCommand({ TransactItems: items }));
    return { ok: true };
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "TransactionCanceledException") throw error;
    const cancellations =
      (error as { CancellationReasons?: { Code?: string }[] }).CancellationReasons ?? [];
    const reasons = cancellations.map((reason) => reason.Code ?? "None");
    return { ok: false, reasons, conflict: reasons.includes(CONFLICT_CODE) };
  }
}
