import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { config } from "./config";

export type KeyFetcher = (parameterName: string) => Promise<string>;

const CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedKey {
  parameterName: string;
  value: string;
  expiresAt: number;
}

let cached: CachedKey | undefined;
let inFlight: { parameterName: string; promise: Promise<string> } | undefined;
let fetcherOverride: KeyFetcher | null = null;
let clockOverride: (() => number) | null = null;
let ssm: SSMClient | undefined;

// Tests inject a fake fetcher and clock so no real SSM call or wall time is needed.
export function setAnthropicKeyHooksForTests(
  hooks: { fetcher?: KeyFetcher; now?: () => number } | null,
): void {
  fetcherOverride = hooks?.fetcher ?? null;
  clockOverride = hooks?.now ?? null;
  cached = undefined;
  inFlight = undefined;
}

const now = (): number => (clockOverride ?? Date.now)();

// Created on first use so importing the module never needs AWS config.
const ssmFetcher: KeyFetcher = async (parameterName) => {
  ssm ??= new SSMClient({});
  const output = await ssm.send(
    new GetParameterCommand({ Name: parameterName, WithDecryption: true }),
  );
  const value = output.Parameter?.Value;
  if (!value) throw new Error("Anthropic API key parameter is empty");
  return value;
};

// Local dev uses ANTHROPIC_API_KEY; deployed Lambdas read the SSM parameter named by
// ANTHROPIC_API_KEY_PARAM. The key is never logged and never placed in an error message.
export async function getAnthropicApiKey(): Promise<string> {
  // A plaintext key in Lambda config would be visible to anyone who can read the function, so it is ignored there.
  const fromEnv = process.env.AWS_LAMBDA_FUNCTION_NAME ? undefined : process.env.ANTHROPIC_API_KEY;
  if (fromEnv) return fromEnv;

  const parameterName = config.anthropicApiKeyParam;
  if (!parameterName) {
    throw new Error("Neither ANTHROPIC_API_KEY nor ANTHROPIC_API_KEY_PARAM is set");
  }
  if (cached?.parameterName === parameterName && cached.expiresAt > now()) return cached.value;
  if (inFlight?.parameterName === parameterName) return inFlight.promise;

  const fetcher = fetcherOverride ?? ssmFetcher;
  const current: Promise<string> = fetcher(parameterName)
    .then((value) => {
      cached = { parameterName, value, expiresAt: now() + CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      if (inFlight?.promise === current) inFlight = undefined;
    });
  inFlight = { parameterName, promise: current };
  return current;
}
