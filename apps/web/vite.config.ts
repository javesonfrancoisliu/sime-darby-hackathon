/// <reference types="vitest/config" />
import { apiProxy, previewServer, pwaBase, pwaIcons } from "@sdh/config/vite.shared";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Dev server proxies /api to the local backend (see README "Frontend notes").
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      react(),
      VitePWA({
        ...pwaBase(),
        manifest: {
          name: "Township Connect",
          short_name: "Township",
          description:
            "Neighbourhood hub for community events, volunteering, and township updates.",
          id: "/",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#F8F9FA",
          theme_color: "#D71920",
          icons: pwaIcons(),
        },
        workbox: {
          ...pwaBase().workbox,
          runtimeCaching: [
            {
              // Live safety / township / community API data: always try the network
              // first, fall back to a short-lived cache only when offline. Never
              // served stale indefinitely. Requests made as a demo user are left
              // uncached: the cache keys on URL only, so it would mix users' data.
              urlPattern: ({ url, request }) =>
                url.pathname.startsWith("/api/") && !request.headers.has("X-Demo-User"),
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                networkTimeoutSeconds: 5,
                expiration: {
                  maxEntries: 32,
                  maxAgeSeconds: 60 * 5, // 5 minutes
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Google Fonts stylesheet + files.
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.googleapis.com" ||
                url.origin === "https://fonts.gstatic.com",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    // Shared packages must use this app's React 19, not the copy installed for the other app.
    resolve: { dedupe: ["react", "react-dom"] },
    server: { port: 5173, proxy: apiProxy(env) },
    preview: previewServer(env, 4173),
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
