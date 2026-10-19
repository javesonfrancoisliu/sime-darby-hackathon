/// <reference types="vitest/config" />
import { apiProxy, previewServer, pwaBase, pwaIcons, THEME_COLOR } from "@sdh/config/vite.shared";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    // The apps share one origin; each is served under its own path.
    base: "/elder/",
    plugins: [
      react(),
      VitePWA({
        ...pwaBase(),
        manifest: {
          name: "Township Connect",
          short_name: "Township Connect",
          description:
            "Connects elderly residents with nearby volunteers for everyday help, plus township safety, community and rewards.",
          id: "/elder/",
          start_url: "/elder/",
          scope: "/elder/",
          display: "standalone",
          orientation: "portrait",
          lang: "en",
          background_color: "#FFF6F3",
          theme_color: THEME_COLOR,
          icons: pwaIcons(),
        },
      }),
    ],
    // Shared packages must use this app's React 18, not the copy installed for the other app.
    resolve: { dedupe: ["react", "react-dom"] },
    server: { port: 5174, strictPort: true, proxy: apiProxy(env) },
    preview: previewServer(env, 4174),
    test: {
      globals: true,
      environment: "jsdom",
      // Shared CI runners are slower and busier than a laptop, so the default 5 seconds is too tight for full-flow tests.
      testTimeout: 20_000,
      setupFiles: ["./src/test/setup.ts"],
      css: true,
    },
  };
});
