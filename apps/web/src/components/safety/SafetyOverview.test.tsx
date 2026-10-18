import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { SafetyPage } from "../../app/safety/SafetyPage";
import { SafetyOverview } from "./SafetyOverview";

const INTERNAL_WORDING = /module|team/i;

describe("safety placeholder copy", () => {
  it("tells residents the safety page is coming soon without internal names", () => {
    render(<SafetyPage />);
    expect(screen.getByText("Health and safety updates are coming soon")).toBeInTheDocument();
    expect(screen.queryByText(INTERNAL_WORDING)).not.toBeInTheDocument();
  });

  it("tells residents the Home safety card is coming soon without internal names", () => {
    render(
      <MemoryRouter>
        <SafetyOverview />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Health and safety updates for your area are coming soon."),
    ).toBeInTheDocument();
    expect(screen.queryByText(INTERNAL_WORDING)).not.toBeInTheDocument();
  });
});
