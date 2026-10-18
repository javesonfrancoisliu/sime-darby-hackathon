/// <reference types="vitest/config" />
import { apiProxy, previewServer, pwaBase, pwaIcons } from "@sdh/config/vite.shared";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      react(),
      VitePWA({
        ...pwaBase(),
        manifest: {
          name: "Help a Neighbour",
          short_name: "Help a Neighbour",
          description:
            "Connects elderly residents with nearby volunteers for everyday help, plus township safety, community and rewards.",
          id: "/",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "portrait",
          lang: "en",
          background_color: "#FFF6F3",
          theme_color: "#D71920",
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
      setupFiles: ["./src/test/setup.ts"],
      css: true,
    },
  };
});
