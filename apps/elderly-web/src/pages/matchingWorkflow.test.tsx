// Full rendered resident flow through the real API dispatcher and an isolated local table.
// Only the provider transport is replaced; production filtering, reranking and validation run. No live inference is possible.
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { dispatch } from "../../../api/src/app";
import { call, createUser, createVerifiedVolunteer } from "../../../api/src/test/api";
import { useTestTable as setupIntegrationTable } from "../../../api/src/test/table";
import { renderApp } from "../test/renderRoute";
import { signInAs } from "../test/fakeApi";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../../../api/src/modules/matching/claudeReranker", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../../api/src/modules/matching/claudeReranker")>();
  return { ...original, sendClaudeMessage: send };
});
setupIntegrationTable();
afterEach(() => {
  vi.unstubAllEnvs();
  send.mockReset();
});

it("submits from the elderly UI, personalizes the young feed and connects acceptance to resident tracking", async () => {
  vi.stubEnv("MATCHING_AI_MODEL_ID", "mock-only-model");
  vi.stubEnv("ANTHROPIC_API_KEY_PARAM", "/mock-only-key");
  send.mockResolvedValue({
    content: [
      {
        type: "tool_use",
        name: "submit_ranking",
        input: { ranking: [{ candidate: "c1", reason: "They are not free at your time." }] },
      },
    ],
  });
  const coordinator = await createUser("coordinator");
  const elder = await createUser("elder", { name: "Fictional Resident" });
  const volunteer = await createVerifiedVolunteer(coordinator.id, {
    name: "Fictional Helper",
    skills: ["groceries"],
  });
  signInAs(elder.id);
  const paths: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), "http://localhost");
      paths.push(`${init?.method ?? "GET"} ${url.pathname}`);
      const response = await dispatch({
        method: init?.method ?? "GET",
        path: url.pathname,
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(new Headers(init?.headers)),
        rawBody: typeof init?.body === "string" ? init.body : undefined,
      });
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  await renderApp("/request/groceries");
  await userEvent.type(screen.getByLabelText(/Tell us more/), "Please help carry grocery bags.");
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.click(screen.getByRole("button", { name: "Tomorrow" }));
  await userEvent.click(screen.getByRole("button", { name: /Afternoon/ }));
  await userEvent.click(screen.getByRole("button", { name: "1 hour" }));
  await userEvent.click(screen.getByRole("button", { name: "Next" }));
  await userEvent.click(screen.getByRole("button", { name: "Send request" }));
  expect(await screen.findByText("Request sent")).toBeInTheDocument();
  expect(screen.queryByText("Suggested volunteers")).not.toBeInTheDocument();
  expect(paths).toContain("POST /api/requests");
  expect(paths.some((path) => path.endsWith("/matches"))).toBe(false);
  const feed = await call("GET", "/api/opportunities", { as: volunteer.id });
  const item = (feed.body as import("@sdh/contracts").OpportunitiesResponse).items.find(
    (item) => item.kind === "request",
  )!;
  expect(item).toMatchObject({ matchScore: 77, matchSource: "ai", matchRank: 1 });
  expect(item.reasons.join(" ")).not.toContain("not free");
  await call("GET", "/api/opportunities", { as: volunteer.id });
  expect(send).toHaveBeenCalledTimes(1);
  if (item.kind !== "request") throw new Error("Expected a help request");
  const accepted = await call("POST", `/api/requests/${item.request.id}/accept`, {
    as: volunteer.id,
  });
  expect(accepted.status).toBe(200);
  const tracked = await call("GET", `/api/requests/${item.request.id}`, { as: elder.id });
  expect(tracked.body).toMatchObject({ status: "matched", volunteerId: volunteer.id });
  expect((await call("GET", "/api/opportunities", { as: volunteer.id })).body).toMatchObject({
    items: [],
  });
});
