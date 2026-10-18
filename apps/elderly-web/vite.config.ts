/// <reference types="vitest/config" />
import { apiProxy, previewServer } from "@sdh/config/vite.shared";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
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
