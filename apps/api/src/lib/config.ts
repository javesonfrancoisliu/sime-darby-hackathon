const DEFAULT_SERVICE_NAME = "sdh-api";
const DEFAULT_MATCHING_AI_TIMEOUT_MS = 3000;

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
  // Kill switch for the simulated sign-in. On by default because the demo has no other login.
  get allowDemoIdentity(): boolean {
    return process.env.ALLOW_DEMO_IDENTITY !== "false";
  },
  get matchingAiModelId(): string | undefined {
    return process.env.MATCHING_AI_MODEL_ID || undefined;
  },
  get matchingAiTimeoutMs(): number {
    const value = Number(process.env.MATCHING_AI_TIMEOUT_MS);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_MATCHING_AI_TIMEOUT_MS;
  },
};
