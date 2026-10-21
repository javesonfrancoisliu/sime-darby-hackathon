/** Per-process transport limit for a separately approved local UI demo. */
export function createOneAttemptFetch(nativeFetch: typeof fetch, reserveAttempt: () => void) {
  let attempts = 0;
  const guarded: typeof fetch = async (input, init) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request ? request.url : String(input));
    if (
      url.origin !== "https://api.anthropic.com" ||
      url.pathname !== "/v1/messages" ||
      (init?.method ?? request?.method ?? "GET").toUpperCase() !== "POST"
    ) {
      throw new Error("Only the approved inference endpoint is permitted in this demo");
    }
    (init?.signal ?? request?.signal)?.throwIfAborted();
    if (attempts >= 1) throw new Error("Approved inference attempt budget exhausted");
    attempts++;
    reserveAttempt(); // Persist before sending; an uncertain outcome still consumes the budget.
    return nativeFetch(input, { ...init, redirect: "error" });
  };
  return {
    fetch: guarded,
    get attempts() {
      return attempts;
    },
  };
}
