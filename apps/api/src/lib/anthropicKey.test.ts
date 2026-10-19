import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAnthropicApiKey, setAnthropicKeyHooksForTests } from "./anthropicKey";

const PARAM = "/sdh/test/anthropic-key";
const TTL_MS = 5 * 60 * 1000;
const SECRET = "sk-ant-test-secret-value";

let clock = 0;

beforeEach(() => {
  clock = 1_000;
  vi.stubEnv("ANTHROPIC_API_KEY", "");
  vi.stubEnv("ANTHROPIC_API_KEY_PARAM", PARAM);
});

afterEach(() => {
  setAnthropicKeyHooksForTests(null);
  vi.unstubAllEnvs();
});

const useFetcher = (fetcher: (name: string) => Promise<string>) => {
  const fn = vi.fn(fetcher);
  setAnthropicKeyHooksForTests({ fetcher: fn, now: () => clock });
  return fn;
};

describe("getAnthropicApiKey", () => {
  it("ignores an ANTHROPIC_API_KEY env var and always reads SSM", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "env-key");
    const fetcher = useFetcher(async () => SECRET);
    expect(await getAnthropicApiKey()).toBe(SECRET);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("fetches once and serves the cache within the TTL", async () => {
    const fetcher = useFetcher(async () => SECRET);
    expect(await getAnthropicApiKey()).toBe(SECRET);
    clock += TTL_MS - 1;
    expect(await getAnthropicApiKey()).toBe(SECRET);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(PARAM);
  });

  it("refetches after the TTL", async () => {
    const fetcher = useFetcher(async () => SECRET);
    await getAnthropicApiKey();
    clock += TTL_MS;
    await getAnthropicApiKey();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shares one fetch between concurrent calls", async () => {
    const fetcher = useFetcher(async () => SECRET);
    const keys = await Promise.all([getAnthropicApiKey(), getAnthropicApiKey()]);
    expect(keys).toEqual([SECRET, SECRET]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("retries on the next call after a failed fetch", async () => {
    const fetcher = useFetcher(async () => SECRET);
    fetcher.mockRejectedValueOnce(new Error("ssm down"));
    await expect(getAnthropicApiKey()).rejects.toThrow("ssm down");
    expect(await getAnthropicApiKey()).toBe(SECRET);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("throws a non-secret message when nothing is configured", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY_PARAM", "");
    useFetcher(async () => SECRET);
    const error = await getAnthropicApiKey().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(SECRET);
  });
});
