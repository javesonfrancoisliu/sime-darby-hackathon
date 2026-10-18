import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";

beforeEach(() => signInAs());

describe("Call 999 on Home", () => {
  it("is a direct tel link outside any dialog", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    const link = await screen.findByRole("link", { name: /Call 999/ });
    expect(link).toHaveAttribute("href", "tel:999");
    expect(link.closest("[role=dialog]")).toBeNull();
  });
});

describe("Demo data honesty", () => {
  it("labels the Safety page and avoids time-of-day claims", async () => {
    installFakeApi();
    await renderApp("/safety");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Demo data");
    expect(screen.queryByText(/Today/)).not.toBeInTheDocument();
  });

  it("labels the Home condition cards", async () => {
    installFakeApi({ "GET /api/requests/mine": { body: { requests: [] } } });
    await renderApp("/");
    const section = (await screen.findByText("Township Live Conditions")).closest("section")!;
    expect(within(section).getAllByText("Demo data").length).toBeGreaterThan(0);
  });

  it("shows an empty Medical ID with no invented details and a fictional number", async () => {
    installFakeApi();
    await renderApp("/me");
    expect(screen.getByText("Add your medical details")).toBeInTheDocument();
    expect(screen.queryByText(/Blood Group|Positive|Zainal/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Township security/ })).toHaveAttribute(
      "href",
      "tel:0355500100",
    );
    expect(screen.getByText("03-5550 0100")).toBeInTheDocument();
  });
});
