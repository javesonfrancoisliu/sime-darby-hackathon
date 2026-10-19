import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { Unconfigured } from "./Unconfigured";

describe("unconfigured build", () => {
  it("explains sign-in is off and links to both apps", () => {
    render(
      <MemoryRouter>
        <Unconfigured />
      </MemoryRouter>,
    );
    expect(screen.getByText("Sign-in is not set up in this build.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Elderly/ })).toHaveAttribute("href", "/elder/");
    expect(screen.getByRole("link", { name: /Youth/ })).toHaveAttribute("href", "/volunteer/");
  });
});
