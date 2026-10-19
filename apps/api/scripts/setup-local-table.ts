// Creates the app table in DynamoDB Local. Refuses to run unless DYNAMODB_ENDPOINT is a loopback URL so it never touches AWS.
import { CreateTableCommand, ResourceInUseException } from "@aws-sdk/client-dynamodb";
import { config, isLoopbackEndpoint } from "../src/lib/config";
import { baseClient } from "../src/lib/db";
import { tableDefinition } from "../src/lib/table-schema";

const endpoint = config.dynamodbEndpoint;
if (!endpoint) {
  console.error("DYNAMODB_ENDPOINT is not set; copy apps/api/.env.example to apps/api/.env first.");
  process.exit(1);
}

if (!isLoopbackEndpoint(endpoint)) {
  console.error(
    `Refusing to run: DYNAMODB_ENDPOINT must be localhost or 127.0.0.1, got ${endpoint}`,
  );
  process.exit(1);
}

try {
  await baseClient().send(new CreateTableCommand(tableDefinition(config.tableName)));
  console.info(`Created table ${config.tableName} at ${endpoint}`);
} catch (error) {
  if (error instanceof ResourceInUseException) {
    console.info(`Table ${config.tableName} already exists at ${endpoint}`);
  } else {
    throw error;
  }
}
