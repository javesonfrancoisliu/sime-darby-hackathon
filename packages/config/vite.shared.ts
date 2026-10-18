// Dev and preview server settings shared by every Vite app, read from env vars.

type Env = Record<string, string | undefined>;

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
