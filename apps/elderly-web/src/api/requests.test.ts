import { describe, expect, it, vi } from "vitest";
import { CreateRequestBody, HelpRequest } from "@sdh/contracts";
import { requestsApi } from "./requests";
import { installFakeApi, signInAs } from "../test/fakeApi";
import { ELDER, makeRequest } from "../test/fixtures";

const request = makeRequest();

describe("requestsApi against the contract", () => {
  it("lists my requests with GET /api/requests/mine and unwraps { requests }", async () => {
    signInAs();
    const { calls } = installFakeApi({
      "GET /api/requests/mine": { body: { requests: [request] } },
    });

    await expect(requestsApi.listMine()).resolves.toEqual([request]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ method: "GET", path: "/api/requests/mine" });
    expect(calls[0]?.headers["x-demo-user"]).toBe(ELDER.id);
  });

  it("gets one request by id", async () => {
    signInAs();
    const { calls } = installFakeApi({ [`GET /api/requests/${request.id}`]: { body: request } });

    const got = await requestsApi.get(request.id);
    expect(HelpRequest.parse(got).title).toBe("Groceries");
    expect(calls[0]).toMatchObject({ method: "GET", path: `/api/requests/${request.id}` });
  });

  it("creates with POST /api/requests and a body the contract accepts", async () => {
    signInAs();
    const body = CreateRequestBody.parse({
      category: "home_help",
      title: "Help at home",
      description: "Change a bulb",
      scheduledAt: "2026-10-20T14:00:00+08:00",
      durationMinutes: 90,
      location: { lat: 3.2, lng: 101.5, area: "Elmina Valley" },
    });
    const { calls } = installFakeApi({
      "POST /api/requests": {
        status: 201,
        body: makeRequest({ ...body, status: "pending_review" }),
      },
    });

    const created = await requestsApi.create(body);
    expect(created.status).toBe("pending_review");
    expect(calls[0]).toMatchObject({ method: "POST", path: "/api/requests", body });
    expect(calls[0]?.headers["x-demo-user"]).toBe(ELDER.id);
    expect(calls[0]?.headers["content-type"]).toBe("application/json");
    expect(CreateRequestBody.safeParse(calls[0]?.body).success).toBe(true);
  });

  it("cancels with POST /api/requests/{id}/cancel and no body", async () => {
    signInAs();
    const { calls } = installFakeApi({
      [`POST /api/requests/${request.id}/cancel`]: { body: makeRequest({ status: "cancelled" }) },
    });

    const cancelled = await requestsApi.cancel(request.id);
    expect(cancelled.status).toBe("cancelled");
    expect(calls[0]).toMatchObject({ method: "POST", path: `/api/requests/${request.id}/cancel` });
    expect(calls[0]?.body).toBeUndefined();
  });

  it("rejects with the API error code when the server refuses", async () => {
    signInAs();
    installFakeApi({
      [`POST /api/requests/${request.id}/cancel`]: {
        status: 409,
        body: { error: { code: "CONFLICT", message: "Already matched" } },
      },
    });
    await expect(requestsApi.cancel(request.id)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("serves labelled demo data only when VITE_USE_MOCK is true, with no network call", async () => {
    const { fetchMock } = installFakeApi();
    vi.stubEnv("VITE_USE_MOCK", "true");
    const list = await requestsApi.listMine();
    expect(list.length).toBeGreaterThan(0);
    for (const r of list) HelpRequest.parse(r);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never falls back to demo data when a live call fails", async () => {
    signInAs();
    installFakeApi({
      "GET /api/requests/mine": {
        status: 500,
        body: { error: { code: "INTERNAL", message: "boom" } },
      },
    });
    await expect(requestsApi.listMine()).rejects.toMatchObject({ code: "INTERNAL" });
  });
});
