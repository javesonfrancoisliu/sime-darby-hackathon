// Creates the app table in DynamoDB Local. Refuses to run unless DYNAMODB_ENDPOINT is a local address, so it never touches AWS.
import { CreateTableCommand, ResourceInUseException } from "@aws-sdk/client-dynamodb";
import { config } from "../src/lib/config";
import { baseClient } from "../src/lib/db";
import { isLoopbackEndpoint } from "../src/lib/local-endpoint";
import { tableDefinition } from "../src/lib/table-schema";

const endpoint = config.dynamodbEndpoint;
if (!endpoint || !isLoopbackEndpoint(endpoint)) {
  console.error("DYNAMODB_ENDPOINT must be set to a local address (see apps/api/.env.example).");
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
