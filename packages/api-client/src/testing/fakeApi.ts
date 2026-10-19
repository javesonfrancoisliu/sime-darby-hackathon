import { afterEach, vi } from "vitest";

import { setAccessTokenProvider } from "../fetch";
import { DEMO_USER_STORAGE_KEY } from "../storage";

// Imported by test files at collection time, so this resets the token provider after every test.
afterEach(() => setAccessTokenProvider(null));

export type Call = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
};

type Reply = { status?: number; body?: unknown };
type Handler = Reply | ((call: Call) => Reply | Promise<Reply>);

// Replaces fetch with routes keyed "METHOD /path". Unlisted routes answer 404 so a stray call fails loudly.
export function installFakeApi(routes: Record<string, Handler> = {}) {
  const calls: Call[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const method = init?.method ?? "GET";
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      headers[key.toLowerCase()] = value;
    }
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const call: Call = { method, path, headers, body };
    calls.push(call);

    const handler = routes[`${method} ${path.split("?")[0]}`];
    if (!handler) {
      return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "No route" } }), {
        status: 404,
      });
    }
    const reply = typeof handler === "function" ? await handler(call) : handler;
    const status = reply.status ?? 200;
    // A 204 reply has no body, as on the real API.
    if (status === 204) return new Response(null, { status });
    return new Response(JSON.stringify(reply.body ?? {}), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

export function signInAs(userId: string) {
  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, userId);
}

// Switches apiFetch to bearer-token mode with a fixed fake token. Reset automatically after each test.
export function signInWithToken(token = "test-token") {
  setAccessTokenProvider(async () => token);
}
