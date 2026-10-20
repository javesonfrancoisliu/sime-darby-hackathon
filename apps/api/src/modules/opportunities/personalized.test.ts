import { afterEach, describe, expect, it, vi } from "vitest";
import type { HelpRequest, OpportunitiesResponse } from "@sdh/contracts";
import { call, createUser } from "../../test/api";
import { useTestTable } from "../../test/table";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../matching/claudeReranker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../matching/claudeReranker")>()),
  sendClaudeMessage: send,
}));
useTestTable();
afterEach(() => {
  vi.unstubAllEnvs();
  send.mockReset();
});

describe("personalized opportunity API", () => {
  it("hybrid-ranks only elderly requests while keeping community drives available on Community", async () => {
    const coordinator = await createUser("coordinator");
    const viewer = await createUser("volunteer", { skills: ["groceries"], availability: [] });
    const elder = await createUser("elder");
    const createdRequest = await call("POST", "/api/requests", {
      as: elder.id,
      body: {
        category: "transport",
        title: "Mixed-feed clinic ride",
        scheduledAt: "2027-01-08T02:00:00Z",
        durationMinutes: 60,
        location: { ...elder.location, area: elder.area },
      },
    });
    expect(createdRequest.status).toBe(201);
    const createdEvent = await call("POST", "/api/events", {
      as: coordinator.id,
      body: {
        title: "Neighbour grocery packing",
        category: "community_activity",
        purpose: "volunteer_drive",
        startsAt: "2027-01-09T02:00:00Z",
        durationMinutes: 60,
        location: { ...viewer.location, area: viewer.area },
        capacity: 20,
      },
    });
    expect(createdEvent.status).toBe(201);
    const event = createdEvent.body as { id: string };
    vi.stubEnv("MATCHING_AI_MODEL_ID", "");
    const baseline = (await call("GET", "/api/opportunities", { as: viewer.id }))
      .body as OpportunitiesResponse;
    const key = (item: OpportunitiesResponse["items"][number]) =>
      item.kind === "event" ? `event:${item.event.id}` : `request:${item.request.id}`;
    vi.stubEnv("MATCHING_AI_MODEL_ID", "mock-mixed-feed");
    send.mockImplementation(async (request) => ({
      content: [
        {
          type: "tool_use",
          name: "submit_ranking",
          input: {
            ranking: JSON.parse(request.messages[0].content)
              .opportunities.map((entry: { label: string }) => ({
                candidate: entry.label,
                reason: "Nearby assistance fits the supplied profile.",
              }))
              .reverse(),
          },
        },
      ],
    }));
    const response = await call("GET", "/api/opportunities", { as: viewer.id });
    expect(response.status).toBe(200);
    const hybrid = response.body as OpportunitiesResponse;
    expect(hybrid.items.map(key)).toEqual(baseline.items.map(key).reverse());
    expect(hybrid.items.every((item) => item.matchSource === "ai")).toBe(true);
    expect(hybrid.items.every((item) => item.explanationSource === "ai")).toBe(true);
    for (const item of hybrid.items)
      expect(item.matchScore).toBe(
        baseline.items.find((previous) => key(previous) === key(item))!.matchScore,
      );
    expect(hybrid.items.some((item) => item.kind === "event" && item.event.id === event.id)).toBe(
      false,
    );
    const promptPayload = JSON.parse(send.mock.calls[0]![0].messages[0].content);
    expect(promptPayload.opportunities.map((item: { kind: string }) => item.kind).sort()).toEqual([
      "request",
    ]);
    expect(JSON.stringify(promptPayload)).not.toContain("Neighbour grocery packing");
    const community = await call("GET", "/api/events", { as: viewer.id });
    expect(
      (community.body as { events: { id: string }[] }).events.some((item) => item.id === event.id),
    ).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await call("POST", `/api/events/${event.id}/join`, { as: viewer.id })).status).toBe(
      200,
    );
  });
  it("serves two realistic requests in rules mode and reports unknown availability honestly", async () => {
    vi.stubEnv("MATCHING_AI_MODEL_ID", "");
    const elder = await createUser("elder");
    const volunteer = await createUser("volunteer", { skills: ["transport"], availability: [] });
    const created: HelpRequest[] = [];
    for (const [category, title] of [
      ["transport", "Ride to the health clinic"],
      ["digital_literacy", "Help with a video call"],
    ]) {
      const response = await call("POST", "/api/requests", {
        as: elder.id,
        body: {
          category,
          title,
          scheduledAt: "2027-01-07T02:00:00Z",
          durationMinutes: 60,
          location: { ...elder.location, area: elder.area },
        },
      });
      expect(response.status).toBe(201);
      created.push(response.body as HelpRequest);
    }
    const response = await call("GET", "/api/opportunities", { as: volunteer.id });
    expect(response.status).toBe(200);
    const items = (response.body as OpportunitiesResponse).items.filter(
      (item) => item.kind === "request" && created.some((r) => r.id === item.request.id),
    );
    expect(items.map((item) => item.matchScore)).toEqual([77, 27]);
    expect(items[0]).toMatchObject({
      request: { title: "Ride to the health clinic", distanceKm: 0.5 },
      matchSource: "rules",
    });
    expect(items[0]!.reasons).toContain("About 0.5 km away");
    expect(items[0]!.reasons).toContain("Your availability is not provided");
    expect(send).not.toHaveBeenCalled();
    expect(
      (await call("POST", `/api/requests/${created[0]!.id}/accept`, { as: volunteer.id })).status,
    ).toBe(200);
    expect(
      (await call("GET", `/api/requests/${created[0]!.id}`, { as: elder.id })).body,
    ).toMatchObject({ status: "matched", volunteerId: volunteer.id });
  });
  it("scores two authenticated volunteers differently and connects acceptance to resident tracking", async () => {
    vi.stubEnv("MATCHING_AI_MODEL_ID", "mock");
    send.mockImplementation(async (request) => {
      const payload = JSON.parse(request.messages[0].content);
      return {
        content: [
          {
            type: "tool_use",
            name: "submit_ranking",
            input: {
              ranking: payload.opportunities.map((r: { label: string }) => ({
                candidate: r.label,
                reason: "Listed skills fit this request.",
              })),
            },
          },
        ],
      };
    });
    const elder = await createUser("elder");
    const grocery = await createUser("volunteer", {
      skills: ["groceries"],
      experience: "Grocery delivery",
    });
    const digital = await createUser("volunteer", {
      skills: ["digital_literacy"],
      experience: "Phone teaching",
    });
    const create = async (category: string, title: string) =>
      (
        await call("POST", "/api/requests", {
          as: elder.id,
          body: {
            category,
            title,
            scheduledAt: "2027-01-06T06:00:00Z",
            durationMinutes: 60,
            location: { ...elder.location, area: elder.area },
          },
        })
      ).body as HelpRequest;
    const bags = await create("groceries", "Carry bags"),
      phone = await create("digital_literacy", "Video calls");
    const feed = async (id: string) =>
      (await call("GET", "/api/opportunities", { as: id })).body as OpportunitiesResponse;
    const a = await feed(grocery.id),
      b = await feed(digital.id);
    expect(a.items[0]).toMatchObject({
      kind: "request",
      request: { id: bags.id },
      matchSource: "ai",
      matchScore: 77,
    });
    expect(b.items[0]).toMatchObject({
      kind: "request",
      request: { id: phone.id },
      matchSource: "ai",
      matchScore: 77,
    });
    const find = (response: OpportunitiesResponse, id: string) =>
      response.items.find((item) => item.kind === "request" && item.request.id === id)!;
    expect(find(a, bags.id).matchScore).toBe(77);
    expect(find(b, bags.id).matchScore).toBe(27);
    expect(find(a, phone.id).matchScore).toBe(27);
    expect(find(b, phone.id).matchScore).toBe(77);
    expect(send).toHaveBeenCalledTimes(2);
    // Inspect real deterministic explanations, not identical mocked model prose.
    vi.stubEnv("MATCHING_AI_MODEL_ID", "");
    const rulesA = await feed(grocery.id),
      rulesB = await feed(digital.id);
    expect(find(rulesA, bags.id)).toMatchObject({ matchSource: "rules", matchScore: 77 });
    expect(find(rulesB, bags.id)).toMatchObject({ matchSource: "rules", matchScore: 27 });
    expect(find(rulesA, bags.id).reasons).not.toEqual(find(rulesB, bags.id).reasons);
    expect(find(rulesA, bags.id).reasons.join(" ")).toContain("Lists groceries as a skill");
    expect(find(rulesB, bags.id).reasons.join(" ")).not.toContain("Lists groceries as a skill");
    expect(send).toHaveBeenCalledTimes(2);
    vi.stubEnv("MATCHING_AI_MODEL_ID", "mock");
    await feed(grocery.id);
    expect(send).toHaveBeenCalledTimes(2);
    const spoofed = await call("GET", "/api/opportunities", {
      as: grocery.id,
      query: { userId: digital.id },
    });
    expect((spoofed.body as OpportunitiesResponse).items[0]).toMatchObject({
      request: { id: bags.id },
      matchScore: 77,
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(a)).not.toContain(grocery.id);
    expect(JSON.stringify(a)).not.toContain("Grocery delivery");
    expect((await call("GET", "/api/opportunities", { as: elder.id })).status).toBe(403);
    expect((await call("POST", `/api/requests/${bags.id}/accept`, { as: grocery.id })).status).toBe(
      200,
    );
    expect((await call("GET", `/api/requests/${bags.id}`, { as: elder.id })).body).toMatchObject({
      status: "matched",
      volunteerId: grocery.id,
    });
    expect(
      (await feed(digital.id)).items.some(
        (item) => item.kind === "request" && item.request.id === bags.id,
      ),
    ).toBe(false);
  });
});
