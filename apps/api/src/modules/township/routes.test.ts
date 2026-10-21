import { describe, expect, it } from "vitest";
import { call } from "../../test/api";
import { createCoordinator, createElder } from "../../test/people";
import { useTestTable } from "../../test/table";

useTestTable();

const body = {
  name: "Elmina",
  securityLine: { display: "03-1234 5678", tel: "+60312345678" },
  emergencyNumber: "999",
};

describe("township", () => {
  it("returns 404 until configured, then is public", async () => {
    expect((await call("GET", "/api/township")).status).toBe(404);
    const coordinator = await createCoordinator();
    const put = await call("PUT", "/api/township", { as: coordinator.id, body });
    expect(put.status).toBe(200);
    const res = await call("GET", "/api/township");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: "elmina", ...body });
    expect(Object.keys(res.body as object).sort()).toEqual(
      ["emergencyNumber", "id", "name", "securityLine", "updatedAt"].sort(),
    );
  });

  it("lets only a coordinator write and validates the body", async () => {
    const elder = await createElder();
    expect((await call("PUT", "/api/township", { as: elder.id, body })).status).toBe(403);
    expect((await call("PUT", "/api/township", { body })).status).toBe(401);
    const coordinator = await createCoordinator();
    const bad = await call("PUT", "/api/township", {
      as: coordinator.id,
      body: { ...body, name: "" },
    });
    expect(bad.status).toBe(400);
    const extra = await call("PUT", "/api/township", {
      as: coordinator.id,
      body: { ...body, id: "other" },
    });
    expect(extra.status).toBe(400);
  });

  it("accepts only dial characters in the phone fields", async () => {
    const coordinator = await createCoordinator();
    const put = (override: Record<string, unknown>) =>
      call("PUT", "/api/township", { as: coordinator.id, body: { ...body, ...override } });
    expect((await put({ emergencyNumber: "+60 (3) 1234-5678" })).status).toBe(200);
    for (const bad of ["javascript:alert(1)", "<b>x</b>", "ab", "---", "1".repeat(21)]) {
      expect((await put({ emergencyNumber: bad })).status).toBe(400);
      const line = await put({ securityLine: { display: "Guard", tel: bad } });
      expect(line.status).toBe(400);
      expect(line.body).toMatchObject({ error: { code: "VALIDATION_FAILED" } });
    }
  });

  it("upserts in place", async () => {
    const coordinator = await createCoordinator();
    await call("PUT", "/api/township", { as: coordinator.id, body });
    await call("PUT", "/api/township", { as: coordinator.id, body: { ...body, name: "Elmina 2" } });
    expect((await call("GET", "/api/township")).body).toMatchObject({ name: "Elmina 2" });
  });
});
