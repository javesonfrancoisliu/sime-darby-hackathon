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
