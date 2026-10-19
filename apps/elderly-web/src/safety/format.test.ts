import { describe, expect, it } from "vitest";
import { formatTemperature, withUnit } from "./format";

describe("formatTemperature", () => {
  it("always writes degrees Celsius the same way", () => {
    expect(formatTemperature(34, "°C")).toBe("34°C");
    expect(formatTemperature(34, "C")).toBe("34°C");
    expect(formatTemperature(39, "°")).toBe("39°C");
  });

  it("falls back to the plain unit rules for other units", () => {
    expect(withUnit(60, "%")).toBe("60%");
    expect(withUnit(2.1, "m")).toBe("2.1 m");
  });
});
