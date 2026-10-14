const DEFAULT_SERVICE_NAME = "sdh-api";

// Read lazily so tests and the local server can set env before first use.
export const config = {
  get serviceName(): string {
    return process.env.SERVICE_NAME || DEFAULT_SERVICE_NAME;
  },
  get tableName(): string {
    const name = process.env.TABLE_NAME;
    if (!name) throw new Error("TABLE_NAME is not set");
    return name;
  },
  get dynamodbEndpoint(): string | undefined {
    return process.env.DYNAMODB_ENDPOINT || undefined;
  },
};
