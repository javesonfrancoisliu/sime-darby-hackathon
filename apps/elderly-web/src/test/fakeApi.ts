import { vi } from "vitest";
import { DEMO_USER_STORAGE_KEY } from "@sdh/api-client";
import { ELDER } from "./fixtures";

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
  const table: Record<string, Handler> = { "GET /api/me": { body: ELDER }, ...routes };

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

    const handler = table[`${method} ${path.split("?")[0]}`];
    if (!handler) {
      return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "No route" } }), {
        status: 404,
      });
    }
    const reply = typeof handler === "function" ? await handler(call) : handler;
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

export function signInAs(userId: string = ELDER.id) {
  window.localStorage.setItem(DEMO_USER_STORAGE_KEY, userId);
}
