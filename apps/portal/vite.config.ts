/// <reference types="vitest/config" />
import { apiProxy, appDevProxies, previewServer } from "@sdh/config/vite.shared";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const DEV_PORT = 5175;
const PREVIEW_PORT = 4175;

// The sign-in app also proxies the other two apps so one local origin serves all three.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    base: "/",
    plugins: [react()],
    // Shared packages must use this app's React copy.
    resolve: { dedupe: ["react", "react-dom"] },
    server: {
      port: DEV_PORT,
      strictPort: true,
      proxy: { ...apiProxy(env), ...appDevProxies(env) },
    },
    preview: previewServer(env, PREVIEW_PORT),
    test: {
      globals: true,
      environment: "jsdom",
      // Avoid CPU contention when multiple app suites run on a shared CI runner.
      maxWorkers: process.env.CI ? 2 : undefined,
      // Shared CI runners are slower and busier than a laptop, so the default 5 seconds is too tight for full-flow tests.
      testTimeout: 20_000,
      setupFiles: ["./src/test/setup.ts"],
    },
  };
});
