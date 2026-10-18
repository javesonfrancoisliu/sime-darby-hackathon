import { describe, expect, it } from "vitest";

import { apiProxy, DEFAULT_API_PROXY_TARGET, previewServer } from "./vite.shared";

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
