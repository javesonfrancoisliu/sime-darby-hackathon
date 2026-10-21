import { describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { createOneAttemptFetch } from "./inferenceBudget";

describe("controlled UI demo transport budget — offline", () => {
  it("also enforces the budget through the installed SDK's default global fetch transport", async () => {
    const native = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "mock",
          content: [],
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    const budget = createOneAttemptFetch(native, () => undefined);
    vi.stubGlobal("fetch", budget.fetch);
    try {
      const client = new Anthropic({
        apiKey: "fictional-test-key",
        baseURL: "https://api.anthropic.com",
        maxRetries: 0,
      });
      const request = {
        model: "claude-haiku-5-5",
        max_tokens: 8,
        messages: [{ role: "user" as const, content: "Fictional offline test" }],
      };
      await client.messages.create(request);
      await expect(client.messages.create(request)).rejects.toThrow();
      expect(native).toHaveBeenCalledTimes(1);
      expect(budget.attempts).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("permits one transport attempt, refuses concurrent repeats, and disables redirects", async () => {
    const native = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}"));
    const reserve = vi.fn();
    const budget = createOneAttemptFetch(native, reserve);
    const url = "https://api.anthropic.com/v1/messages";
    const result = await Promise.allSettled([
      budget.fetch(url, { method: "POST" }),
      budget.fetch(url, { method: "POST" }),
    ]);
    expect(result.map((r) => r.status)).toEqual(["fulfilled", "rejected"]);
    expect(native).toHaveBeenCalledTimes(1);
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(native.mock.calls[0]?.[1]?.redirect).toBe("error");
    expect(budget.attempts).toBe(1);
  });
  it("does not retry after errors or allow models/token-count/other endpoints", async () => {
    const native = vi.fn<typeof fetch>().mockRejectedValue(new Error("mock network failure"));
    const budget = createOneAttemptFetch(native, () => undefined);
    await expect(budget.fetch("https://api.anthropic.com/v1/models")).rejects.toThrow();
    await expect(
      budget.fetch("https://elsewhere.example/v1/messages", { method: "POST" }),
    ).rejects.toThrow();
    await expect(
      budget.fetch("https://api.anthropic.com/v1/messages", { method: "POST" }),
    ).rejects.toThrow();
    await expect(
      budget.fetch("https://api.anthropic.com/v1/messages", { method: "POST" }),
    ).rejects.toThrow(/exhausted/);
    expect(native).toHaveBeenCalledTimes(1);
  });
  it("will not send an aborted call or a request whose audit reservation fails", async () => {
    const native = vi.fn<typeof fetch>();
    const budget = createOneAttemptFetch(native, () => {
      throw new Error("audit failed");
    });
    const url = "https://api.anthropic.com/v1/messages";
    await expect(
      budget.fetch(url, { method: "POST", signal: AbortSignal.abort() }),
    ).rejects.toThrow();
    expect(budget.attempts).toBe(0);
    await expect(budget.fetch(new Request(url, { method: "POST" }))).rejects.toThrow(
      "audit failed",
    );
    expect(native).not.toHaveBeenCalled();
    expect(budget.attempts).toBe(1);
  });
});
