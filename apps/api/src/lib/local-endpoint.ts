const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

// True only for a URL that points at this machine, so seed and setup scripts never reach a remote table.
export function isLoopbackEndpoint(endpoint: string | undefined): boolean {
  if (!endpoint) return false;
  try {
    return LOOPBACK_HOSTS.has(new URL(endpoint).hostname);
  } catch {
    return false;
  }
}
