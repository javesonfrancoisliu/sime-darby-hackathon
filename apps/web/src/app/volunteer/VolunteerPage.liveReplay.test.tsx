// Replays the genuine saved one-attempt response. No provider/network inference occurs.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OpportunitiesResponse, type User } from "@sdh/contracts";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { installFakeApi, signInAs } from "../../test/fakeApi";
import { VOLUNTEER } from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";
import { prepareExplanation } from "../../../../api/src/modules/matching/explanations";

const artifact = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        `../api/scripts/matching-benchmark/results/young-e2e-2026-10-20/${name}.json`,
      ),
      "utf8",
    ).replace(/^\uFEFF/, ""),
  );
const feed = OpportunitiesResponse.parse(artifact("hybrid-feed"));
const profile = artifact("profile-evidence") as Pick<
  User,
  "id" | "name" | "skills" | "experience" | "availability" | "area" | "role" | "verification"
>;

afterEach(() => vi.restoreAllMocks());

it("renders the updated 154/143-character saved explanations with accurate source labels and unchanged scores", async () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-20T12:00:00Z"));
  const raw = JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "../api/scripts/matching-benchmark/results/young-ui-2026-10-20-3/response.json",
      ),
      "utf8",
    ).replace(/^\uFEFF/, ""),
  );
  const ranking = raw.content[0].input.ranking as { candidate: string; reason: string }[];
  const user = { ...VOLUNTEER, ...profile };
  const requests = feed.items
    .filter((item) => item.kind === "request")
    .filter((item) => item.request.title !== "Ride to the health clinic");
  const updated = requests.map((item, index) => {
    const explanation = prepareExplanation(ranking[index]!.reason, {
      volunteer: user,
      score: item.matchScore,
      distanceKm: item.request.distanceKm,
      components: { skill: 0, proximity: 1 - item.request.distanceKm / 5, availability: 1 },
      reasons: item.reasons,
    });
    return {
      ...item,
      reasons: [explanation.reason],
      explanationSource:
        explanation.treatment === "rule-replacement" ? ("rules" as const) : ("ai" as const),
    };
  });
  expect(ranking.map((item) => item.reason.length)).toEqual([154, 143]);
  expect(updated.map((item) => item.reasons[0]!.length)).toEqual([154, 143]);
  installFakeApi(signedInRoutes(user, { "GET /api/opportunities": { body: { items: updated } } }));
  signInAs(user.id);
  renderApp("/volunteer");
  await screen.findByLabelText("Opportunity: Explain a health leaflet");
  expect(screen.getAllByText("AI-assisted")).toHaveLength(2);
  for (const item of updated) {
    const card = screen.getByLabelText(`Opportunity: ${item.request.title}`);
    await userEvent.click(
      within(card).getByRole("button", { name: `${item.matchScore}% match. Why this matches you` }),
    );
    const region = within(card).getByRole("region", { name: "Why this matches you" });
    expect(within(region).getByText("Claude explanation")).toBeVisible();
    expect(within(region).getByText(item.reasons[0]!)).toBeVisible();
    expect(within(region).queryByText("Rule-based explanation (fallback)")).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /^Accept & help: / })).toBeVisible();
  }
});

it("renders genuine saved Claude justifications and server order with independent mobile sort controls", async () => {
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-20T12:00:00Z"));
  const user = { ...VOLUNTEER, ...profile };
  installFakeApi(signedInRoutes(user, { "GET /api/opportunities": { body: feed } }));
  signInAs(user.id);
  renderApp("/volunteer");
  const clinic = await screen.findByLabelText(/^Opportunity: Ride to the health clinic/);
  const requestItems = feed.items.filter((item) => item.kind === "request");
  const requestTitles = requestItems.map((item) => item.request.title);
  expect(screen.getAllByLabelText(/^Opportunity:/)).toHaveLength(requestItems.length);
  const displayedRequests = () =>
    screen
      .getAllByLabelText(/^Opportunity:/)
      .map((card) => card.getAttribute("aria-label")!)
      .filter((label) => requestTitles.some((title) => label.startsWith(`Opportunity: ${title}`)));
  expect(displayedRequests()).toEqual(requestTitles.map((title) => expect.stringContaining(title)));
  expect(screen.getAllByText("AI-assisted")).toHaveLength(3);
  for (const item of requestItems) {
    const card = screen.getByLabelText(new RegExp(`^Opportunity: ${item.request.title}`));
    const match = within(card).getByRole("button", {
      name: `${item.matchScore}% match. Why this matches you`,
    });
    await userEvent.click(match);
    const explanation = within(card).getByRole("region", { name: "Why this matches you" });
    expect(within(explanation).getByText(item.reasons[0]!)).toBeVisible();
    expect(item.reasons[0]!.length).toBeLessThanOrEqual(240);
  }
  expect(within(clinic).getByRole("button", { name: /^Accept & help: / })).toBeVisible();
  const sort = screen.getByRole("combobox", { name: "Sort by" });
  await userEvent.selectOptions(sort, "nearest");
  expect(displayedRequests()[0]).toContain("Explain a health leaflet");
  await userEvent.selectOptions(sort, "soonest");
  expect(displayedRequests()[0]).toContain("Ride to the health clinic");
  await userEvent.selectOptions(sort, "urgent");
  expect(displayedRequests()[0]).toContain("Ride to the health clinic");
  await userEvent.selectOptions(sort, "best_match");
  expect(displayedRequests()).toEqual(requestTitles.map((title) => expect.stringContaining(title)));
});
