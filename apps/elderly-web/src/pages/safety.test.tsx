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

  it("shows the demo Medical ID and a fictional security number", async () => {
    installFakeApi();
    await renderApp("/me");
    expect(screen.getByText("Blood Group")).toBeInTheDocument();
    expect(screen.getByText("O Positive")).toBeInTheDocument();
    expect(screen.getByText("012-345 6789")).toHaveClass("text-nowrap");
    expect(screen.getByText(/Zainal \(Son\)/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Township security/ })).toHaveAttribute(
      "href",
      "tel:0355500100",
    );
    expect(screen.getByText("03-5550 0100")).toBeInTheDocument();
  });
});

describe("Safety page", () => {
  it("opens on the tab named in the link and names the panel", async () => {
    installFakeApi();
    await renderApp("/safety#temp");
    const tab = screen.getByRole("tab", { name: /Heat/ });
    expect(tab).toHaveAttribute("aria-selected", "true");
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    const section = screen.getByRole("region", { name: "Temperature Alerts" });
    expect(panel).toContainElement(section);
  });

  it("keeps a Call 999 link in view", async () => {
    installFakeApi();
    await renderApp("/safety");
    expect(screen.getByRole("link", { name: /Call 999/ })).toHaveAttribute("href", "tel:999");
  });

  it("draws the moderate air quality bar in the caution tone on the standard track", async () => {
    installFakeApi();
    await renderApp("/safety");
    const [bar] = screen.getAllByLabelText(/API level/);
    expect(bar?.className).toBe("safety-bar");
    expect(bar?.firstElementChild).toHaveClass("safety-bar__fill--tone", "tone-caution");
  });

  it("draws the water bars ok, mid and high by how near the level is to its normal maximum", async () => {
    installFakeApi();
    await renderApp("/safety#water");
    const fillOf = (label: RegExp) => screen.getByLabelText(label).firstElementChild;
    expect(fillOf(/Water level 1.4m/)).toHaveClass("safety-bar__fill--ok");
    expect(fillOf(/Water level 2.1m/)).toHaveClass("safety-bar__fill--mid");
    expect(fillOf(/Water level 3.8m/)).toHaveClass("safety-bar__fill--high");
  });

  it("does not name real agencies for example readings", async () => {
    installFakeApi();
    await renderApp("/safety");
    expect(screen.queryByText(/Department of Environment/)).not.toBeInTheDocument();
    expect(screen.getByText(/not from any agency/)).toBeInTheDocument();
  });
});
