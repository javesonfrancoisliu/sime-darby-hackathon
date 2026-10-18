// Dev and preview server settings shared by every Vite app, read from env vars.

type Env = Record<string, string | undefined>;

// Brand red (#D71920) for the PWA manifest and the generated icon backgrounds.
export const THEME_COLOR = "#D71920";

export const DEFAULT_API_PROXY_TARGET = "http://127.0.0.1:3001";

export function apiProxy(env: Env) {
  return {
    "/api": {
      target: env.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET,
      changeOrigin: true,
    },
  };
}

// Preview listens on localhost only. Set PREVIEW_HOST (e.g. 0.0.0.0) and
// PREVIEW_ALLOWED_HOSTS (comma separated, e.g. .loca.lt) to share it via a tunnel.
export function previewServer(env: Env, port: number) {
  const allowedHosts = (env.PREVIEW_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  return {
    host: env.PREVIEW_HOST || "localhost",
    port,
    strictPort: true,
    allowedHosts,
  };
}

// Service worker settings shared by every PWA: precache the built app shell, never answer /api from the shell.
export function pwaBase() {
  return {
    registerType: "autoUpdate" as const,
    includeAssets: ["icons/apple-touch-icon.png"],
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      navigateFallback: "index.html",
      navigateFallbackDenylist: [/^\/api\//],
      // Fresh workers take over on their own, so an old shell is not kept by open tabs.
      cleanupOutdatedCaches: true,
    },
    devOptions: { enabled: false },
  };
}

// The same four icons come out of packages/config/generate-icons.mjs for every app.
export function pwaIcons() {
  return [
    { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
    { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
    { src: "icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];
}

type CacheableRequest = {
  url: { pathname: string };
  request: { method: string; headers: { has(name: string): boolean } };
};

// Runtime cache for the only API read that is public and carries no personal data:
// the event list requested while signed out. Anything sent with the X-Demo-User
// header, and every other path (/api/demo/users, /api/me, requests), goes straight
// to the network, because the cache keys on the URL alone and would mix users.
// The matcher is copied into the service worker as text, so it must stay self-contained.
export function publicApiCache() {
  return {
    urlPattern: ({ url, request }: CacheableRequest) =>
      request.method === "GET" &&
      !request.headers.has("X-Demo-User") &&
      url.pathname === "/api/events",
    handler: "NetworkFirst" as const,
    options: {
      cacheName: "public-api-cache",
      networkTimeoutSeconds: 5,
      expiration: { maxEntries: 4, maxAgeSeconds: 60 * 5 },
      cacheableResponse: { statuses: [0, 200] },
    },
  };
}
