const DEFAULT_SERVICE_NAME = "sdh-api";
const DEFAULT_MATCHING_AI_TIMEOUT_MS = 3000;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function isLoopbackEndpoint(endpoint: string | undefined): boolean {
  if (!endpoint) return false;
  try {
    return LOOPBACK_HOSTS.has(new URL(endpoint).hostname);
  } catch {
    return false;
  }
}

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
  // Only the exact string "true" turns on the simulated demo sign-in, and never next to real
  // Cognito sign-in, where it would let anyone act as a real user.
  get demoAuthEnabled(): boolean {
    return process.env.DEMO_AUTH_ENABLED === "true" && !config.bearerAuthEnabled;
  },
  get cognitoUserPoolId(): string | undefined {
    return process.env.COGNITO_USER_POOL_ID || undefined;
  },
  get cognitoClientId(): string | undefined {
    return process.env.COGNITO_CLIENT_ID || undefined;
  },
  // Bearer sign-in needs both Cognito values.
  get bearerAuthEnabled(): boolean {
    return Boolean(config.cognitoUserPoolId && config.cognitoClientId);
  },
  get matchingAiModelId(): string | undefined {
    return process.env.MATCHING_AI_MODEL_ID || undefined;
  },
  get anthropicApiKeyParam(): string | undefined {
    return process.env.ANTHROPIC_API_KEY_PARAM || undefined;
  },
  get matchingAiTimeoutMs(): number {
    const value = Number(process.env.MATCHING_AI_TIMEOUT_MS);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_MATCHING_AI_TIMEOUT_MS;
  },
};
