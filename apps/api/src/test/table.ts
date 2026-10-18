import { randomUUID } from "node:crypto";
import { CreateTableCommand, DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import { afterAll, beforeAll } from "vitest";
import { baseClient } from "../lib/db";
import { tableDefinition } from "../lib/table-schema";

const DEFAULT_LOCAL_ENDPOINT = "http://127.0.0.1:8000";

// Gives each test file its own throwaway table in DynamoDB Local; never points at AWS.
export function useTestTable(): void {
  const tableName = `sdh-test-${randomUUID()}`;

  beforeAll(async () => {
    process.env.DYNAMODB_ENDPOINT = process.env.DYNAMODB_ENDPOINT || DEFAULT_LOCAL_ENDPOINT;
    process.env.TABLE_NAME = tableName;
    process.env.DEMO_AUTH_ENABLED = "true";
    try {
      await baseClient().send(new CreateTableCommand(tableDefinition(tableName)));
    } catch (error) {
      throw new Error(
        `DynamoDB Local is not reachable at ${process.env.DYNAMODB_ENDPOINT}. Start it with: pnpm db:up`,
        { cause: error },
      );
    }
  });

  afterAll(async () => {
    await baseClient().send(new DeleteTableCommand({ TableName: tableName }));
  });
}
