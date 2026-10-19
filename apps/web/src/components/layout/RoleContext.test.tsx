import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RoleProvider, useRole } from "./RoleContext";

function Probe() {
  return <span data-testid="role">{useRole().role}</span>;
}

afterEach(() => vi.unstubAllEnvs());

describe("RoleProvider", () => {
  it("lets the dev preview override the role while previewing is allowed", () => {
    vi.stubEnv("VITE_DEV_ROLE", "elderly");
    render(
      <RoleProvider role="young">
        <Probe />
      </RoleProvider>,
    );
    expect(screen.getByTestId("role")).toHaveTextContent("elderly");
  });

  it("ignores the dev preview when it is not allowed, as when someone is signed in", () => {
    vi.stubEnv("VITE_DEV_ROLE", "elderly");
    render(
      <RoleProvider role="young" allowPreview={false}>
        <Probe />
      </RoleProvider>,
    );
    expect(screen.getByTestId("role")).toHaveTextContent("young");
  });
});
