import { describe, expect, it } from "vitest";

import {
  apiProxy,
  DEFAULT_API_PROXY_TARGET,
  previewServer,
  pwaBase,
  publicApiCache,
  pwaIcons,
} from "./vite.shared";

describe("apiProxy", () => {
  it("defaults to the local backend", () => {
    expect(apiProxy({})["/api"].target).toBe(DEFAULT_API_PROXY_TARGET);
  });

  it("uses API_PROXY_TARGET when set", () => {
    expect(apiProxy({ API_PROXY_TARGET: "http://10.0.0.5:3001" })["/api"].target).toBe(
      "http://10.0.0.5:3001",
    );
  });
});

describe("previewServer", () => {
  it("listens on localhost with no extra hosts by default", () => {
    expect(previewServer({}, 4174)).toEqual({
      host: "localhost",
      port: 4174,
      strictPort: true,
      allowedHosts: [],
    });
  });

  it("reads host and a comma separated allow list from env", () => {
    const server = previewServer(
      { PREVIEW_HOST: "0.0.0.0", PREVIEW_ALLOWED_HOSTS: ".loca.lt, demo.example.com ," },
      4173,
    );
    expect(server.host).toBe("0.0.0.0");
    expect(server.allowedHosts).toEqual([".loca.lt", "demo.example.com"]);
  });
});

describe("pwaBase", () => {
  it("precaches the shell and keeps /api out of the navigation fallback", () => {
    const { workbox } = pwaBase();
    expect(workbox.globPatterns[0]).toContain("html");
    expect(workbox.navigateFallbackDenylist.some((re) => re.test("/api/requests"))).toBe(true);
    expect(workbox.navigateFallbackDenylist.some((re) => re.test("/requests"))).toBe(false);
  });

  it("has no runtime caching, so API replies are never stored", () => {
    expect("runtimeCaching" in pwaBase().workbox).toBe(false);
  });
});

describe("pwaIcons", () => {
  it("lists square 192 and 512 icons plus one maskable", () => {
    const icons = pwaIcons();
    expect(icons.map((i) => i.sizes)).toEqual(["192x192", "512x512", "512x512"]);
    expect(icons.filter((i) => i.purpose === "maskable")).toHaveLength(1);
  });
});

describe("publicApiCache", () => {
  // Run the matcher from its source text, the way the service worker receives it.
  const matches = new Function(`return ${String(publicApiCache().urlPattern)}`)() as (
    input: ReturnType<typeof call>,
  ) => boolean;

  function call(path: string, options: { method?: string; demoUser?: string } = {}) {
    const headers = new Headers(options.demoUser ? { "X-Demo-User": options.demoUser } : {});
    return {
      url: new URL(path, "https://app.test"),
      request: { method: options.method ?? "GET", headers },
    };
  }

  it("caches the signed-out event list", () => {
    expect(matches(call("/api/events"))).toBe(true);
  });

  it("never caches requests made as a demo user", () => {
    expect(matches(call("/api/events", { demoUser: "u1" }))).toBe(false);
  });

  it("never caches the demo user list or other personal reads", () => {
    for (const path of [
      "/api/demo/users",
      "/api/me",
      "/api/requests/mine",
      "/api/opportunities",
      "/api/contributions/mine",
      "/api/health",
      "/api/events/abc/join",
    ]) {
      expect(matches(call(path)), path).toBe(false);
    }
  });

  it("ignores writes", () => {
    expect(matches(call("/api/events", { method: "POST" }))).toBe(false);
  });
});
