import { beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderApp } from "../test/renderRoute";
import { installFakeApi, signInAs } from "../test/fakeApi";
import {
  BADGE,
  ELDER,
  POINTS,
  REWARD,
  STREAK,
  TEAM_CHALLENGE,
  makeRequest,
} from "../test/fixtures";

beforeEach(() => signInAs());

const request = makeRequest({ id: "9d2f5c74-8b2c-4e55-9f90-2c3b8e3f4a03" });

describe("read-aloud and Aa buttons on request pages", () => {
  const readAloud = { name: /read page aloud/i };
  const aa = { name: /text and sound settings/i };

  it.each([
    ["list", "/requests"],
    ["category", "/request"],
    ["create", "/request/groceries"],
    ["detail", `/requests/${request.id}`],
  ])("shows both on the %s page", async (_name, path) => {
    installFakeApi({
      "GET /api/requests/mine": { body: { requests: [request] } },
      [`GET /api/requests/${request.id}`]: { body: request },
    });
    await renderApp(path);
    expect(await screen.findByRole("button", readAloud)).toBeInTheDocument();
    expect(screen.getByRole("button", aa)).toBeInTheDocument();
  });
});

describe("Rewards rankings", () => {
  it("lists the signed-in person once, with their real points", async () => {
    installFakeApi({
      "GET /api/me": { body: { ...ELDER, name: "Auntie Mary" } },
      "GET /api/me/points": { body: POINTS(0) },
      "GET /api/me/streak": { body: STREAK },
      "GET /api/challenges": { body: { challenges: [TEAM_CHALLENGE] } },
      "GET /api/rewards": { body: { rewards: [REWARD] } },
      "GET /api/badges": { body: { badges: [BADGE] } },
    });
    await renderApp("/challenges");
    const board = await screen.findByRole("list", { name: /neighbour rankings/i });
    const mine = within(board).getAllByText("Auntie Mary");
    expect(mine).toHaveLength(1);
    expect(within(board).getAllByText("(you)")).toHaveLength(1);
    expect(within(board).queryByText("You")).not.toBeInTheDocument();
    expect(within(board).queryByText("320 pts")).not.toBeInTheDocument();
    expect(within(board).getByText("0 pts")).toBeInTheDocument();
    // No invented neighbours: only the signed-in person is listed.
    expect(within(board).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText(/other neighbours will appear here/i)).toBeInTheDocument();
  });
});
