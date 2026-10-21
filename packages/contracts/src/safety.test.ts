import { describe, expect, it } from "vitest";
import { PutSafetyReadingBody, PutTownshipBody } from "./index";

const air = {
  type: "air",
  level: "good",
  area: "Precinct 1",
  value: 40,
  unit: "AQI",
  advice: "Enjoy outdoors",
  measuredAt: "2026-10-19T08:00:00+08:00",
};

describe("PutSafetyReadingBody", () => {
  it("accepts a bounded reading and rejects unbounded, negative and denormal values", () => {
    expect(PutSafetyReadingBody.safeParse(air).success).toBe(true);
    for (const value of [1e21, 1e16, 5e-324, -1, 100_001, Infinity, NaN]) {
      expect(PutSafetyReadingBody.safeParse({ ...air, value }).success).toBe(false);
    }
  });

  it("rejects a measuredAt more than a day ahead and names the field", () => {
    const result = PutSafetyReadingBody.safeParse({ ...air, measuredAt: "2999-01-01T00:00:00Z" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["measuredAt"]);
  });
});

describe("PutTownshipBody", () => {
  const body = {
    name: "Elmina",
    securityLine: { display: "Guard house", tel: "+60 3-1234 5678" },
    emergencyNumber: "999",
  };

  it("accepts dial strings and rejects anything else", () => {
    expect(PutTownshipBody.safeParse(body).success).toBe(true);
    for (const bad of ["javascript:alert(1)", "<b>x</b>", "+++", "1234567890123456789012"]) {
      expect(PutTownshipBody.safeParse({ ...body, emergencyNumber: bad }).success).toBe(false);
      expect(
        PutTownshipBody.safeParse({ ...body, securityLine: { display: "x", tel: bad } }).success,
      ).toBe(false);
    }
  });
});
