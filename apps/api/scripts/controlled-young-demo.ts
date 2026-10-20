// DO NOT RUN without explicit approval for one Young-role end-to-end inference attempt.
import { mkdirSync, writeFileSync } from "node:fs";
import { isLoopbackEndpoint } from "../src/lib/config";
import { createOneAttemptFetch } from "./matching-benchmark/inferenceBudget";

if (process.argv[2] !== "--approved-one-young-e2e")
  throw new Error("Separate explicit approval required");
if (!isLoopbackEndpoint(process.env.DYNAMODB_ENDPOINT) || process.env.DEMO_AUTH_ENABLED !== "true")
  throw new Error(
    "This controlled runner is for local demo authentication and local DynamoDB only",
  );
if (process.env.MATCHING_AI_MODEL_ID?.trim())
  throw new Error("Keep the persistent app configuration in rules mode");
if (
  process.env.ANTHROPIC_API_KEY_PARAM !== "/sime-darby-hackathon/dev/anthropic-api-key" ||
  process.env.AWS_PROFILE !== "sdh-dev" ||
  process.env.AWS_REGION !== "ap-southeast-5"
)
  throw new Error("Expected existing secure AWS configuration");
mkdirSync("node_modules/.cache", { recursive: true });
// A new ID is only for a separately approved attempt; previous audits stay immutable.
const approvalId = process.argv[3] ?? "20261020";
if (!/^[a-z0-9-]{1,64}$/.test(approvalId)) throw new Error("Invalid approval audit ID");
const audit = `node_modules/.cache/young-e2e-approval-${approvalId}`;
writeFileSync(
  `${audit}-reserved.json`,
  JSON.stringify({ limit: 1, model: "claude-haiku-5-5", retries: 0 }),
  { flag: "wx" },
);
const nativeFetch = globalThis.fetch;
const measuredFetch: typeof fetch = async (input, init) => {
  const started = performance.now();
  const requestBody = typeof init?.body === "string" ? JSON.parse(init.body) : null;
  // Preserve only the fictional model payload, never authentication headers.
  writeFileSync(
    `${audit}-input.json`,
    JSON.stringify({
      model: requestBody?.model,
      max_tokens: requestBody?.max_tokens,
      system: requestBody?.system,
      messages: requestBody?.messages,
      tools: requestBody?.tools,
      tool_choice: requestBody?.tool_choice,
    }),
    { flag: "wx" },
  );
  let response: Response;
  try {
    response = await nativeFetch(input, init);
  } catch {
    writeFileSync(
      `${audit}-response.json`,
      JSON.stringify({
        status: null,
        latencyMs: performance.now() - started,
        outcome: "transport-failed-or-aborted",
        usage: null,
      }),
      { flag: "wx" },
    );
    throw new Error("Approved Claude transport failed or timed out; attempt consumed");
  }
  let metadata: Record<string, unknown>;
  try {
    const body = (await response.clone().json()) as {
      model?: unknown;
      usage?: Record<string, unknown>;
      content?: unknown;
    };
    const usage = Object.fromEntries(
      [
        "input_tokens",
        "output_tokens",
        "cache_read_input_tokens",
        "cache_creation_input_tokens",
      ].flatMap((key) => (typeof body.usage?.[key] === "number" ? [[key, body.usage[key]]] : [])),
    );
    // Fictional test content only; never persist request headers, keys or AWS credentials.
    metadata = {
      model: typeof body.model === "string" ? body.model : null,
      usage,
      content: response.ok && Array.isArray(body.content) ? body.content : null,
    };
  } catch {
    metadata = { usage: null };
  }
  writeFileSync(
    `${audit}-response.json`,
    JSON.stringify({
      status: response.status,
      latencyMs: performance.now() - started,
      ...metadata,
    }),
    { flag: "wx" },
  );
  return response;
};
const budget = createOneAttemptFetch(measuredFetch, () => {
  writeFileSync(
    `${audit}-attempt.json`,
    JSON.stringify({ attempt: 1, at: new Date().toISOString() }),
    { flag: "wx" },
  );
  console.log("Approved Claude attempt 1/1 reserved. Further inference attempts are blocked.");
});
globalThis.fetch = budget.fetch;
process.env.ANTHROPIC_BASE_URL = "https://api.anthropic.com";
process.env.MATCHING_AI_MODEL_ID = "claude-haiku-5-5"; // This process only; .env stays blank.
process.env.MATCHING_AI_TIMEOUT_MS = "9000";
process.env.AWS_MAX_ATTEMPTS = "1";
await import("../src/local");
