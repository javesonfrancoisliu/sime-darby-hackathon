import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpdateMeBody, User } from "@sdh/contracts";
import { describe, expect, it } from "vitest";

import { installFakeApi, signInAs } from "../../test/fakeApi";
import {
  makeBadge,
  makeChallenge,
  makePoints,
  makeReward,
  QUIZ_PUBLIC,
  VOLUNTEER,
} from "../../test/fixtures";
import { renderApp } from "../../test/renderApp";
import { signedInRoutes } from "../../test/routes";

const CHALLENGE = makeChallenge();
const QUIZ_CHALLENGE = makeChallenge({
  id: "0a1b2c3d-5555-4a55-8a55-000000000005",
  title: "Eco quiz",
  category: "environment",
  goal: { target: 2, unit: "correct answers", type: "quiz" },
  quizId: QUIZ_PUBLIC.id,
});
const error = (code: string, message: string, status = 409) => ({
  status,
  body: { error: { code, message } },
});

async function openTab(name: string) {
  const user = userEvent.setup();
  await user.click(await screen.findByRole("tab", { name }));
  return user;
}

describe("challenges page", () => {
  it("lists challenges from the API with the caller's progress and no demo labels", async () => {
    installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/challenges": {
          body: {
            challenges: [
              {
                ...CHALLENGE,
                progress: {
                  challengeId: CHALLENGE.id,
                  status: "in_progress",
                  current: 5000,
                  joinedAt: "2026-10-18T00:00:00Z",
                },
              },
            ],
          },
        },
        "GET /api/me/points": { body: makePoints(120) },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");

    const card = await screen.findByLabelText("Challenge: Walk 20,000 steps");
    expect(within(card).getByText("5000 / 20000 steps")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Log progress" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your challenge progress")).toHaveTextContent("120");
    expect(screen.queryByText(/demo/i)).not.toBeInTheDocument();
  });

  it("joins a challenge through the API", async () => {
    const { calls } = installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/challenges": { body: { challenges: [CHALLENGE] } },
        [`POST /api/challenges/${CHALLENGE.id}/join`]: {
          body: {
            progress: {
              challengeId: CHALLENGE.id,
              status: "in_progress",
              current: 0,
              joinedAt: "2026-10-19T00:00:00Z",
            },
            pointsAwarded: 0,
          },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Join challenge" }));
    expect(await screen.findByRole("dialog", { name: "Challenge joined" })).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path.endsWith("/join"))).toBe(true);
  });

  it("saves logged progress with PUT and shows a pending verification state", async () => {
    const pending = {
      ...CHALLENGE,
      requiresVerification: true,
      progress: {
        challengeId: CHALLENGE.id,
        status: "pending_verification",
        current: 20000,
        joinedAt: "2026-10-18T00:00:00Z",
      },
    };
    installFakeApi(
      signedInRoutes(VOLUNTEER, { "GET /api/challenges": { body: { challenges: [pending] } } }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");

    const card = await screen.findByLabelText("Challenge: Walk 20,000 steps");
    expect(within(card).getByText("Waiting for verification")).toBeInTheDocument();
    expect(within(card).queryByRole("button")).not.toBeInTheDocument();
  });

  it("logs progress with PUT /progress", async () => {
    const joined = {
      ...CHALLENGE,
      progress: {
        challengeId: CHALLENGE.id,
        status: "in_progress",
        current: 0,
        joinedAt: "2026-10-18T00:00:00Z",
      },
    };
    const { calls } = installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/challenges": { body: { challenges: [joined] } },
        [`PUT /api/challenges/${CHALLENGE.id}/progress`]: { body: {} },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Log progress" }));
    const dialog = await screen.findByRole("dialog");
    const field = within(dialog).getByLabelText("Total steps");
    await user.clear(field);
    await user.type(field, "8000");
    await user.click(within(dialog).getByRole("button", { name: "Save progress" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(calls.find((c) => c.method === "PUT")?.body).toEqual({ current: 8000 });
  });

  it("adds a team contribution and explains when today's was already added", async () => {
    const team = {
      ...makeChallenge({ mode: "team", title: "Clean the park" }),
      teamProgress: { precinct: "Elmina West", current: 40 },
    };
    installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/challenges": { body: { challenges: [team] } },
        [`POST /api/challenges/${team.id}/contribute`]: error(
          "ALREADY_DONE",
          "Already contributed today",
        ),
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");
    const user = userEvent.setup();

    const card = await screen.findByLabelText("Challenge: Clean the park");
    expect(within(card).getByText("40 / 20000 steps")).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: /today.s contribution/ }));
    expect(
      await screen.findByText("You have already contributed today. Come back tomorrow."),
    ).toBeInTheDocument();
  });

  it("submits a quiz, shows only the score and verdict, and never the answers", async () => {
    const joined = {
      ...QUIZ_CHALLENGE,
      progress: {
        challengeId: QUIZ_CHALLENGE.id,
        status: "in_progress",
        current: 0,
        joinedAt: "2026-10-18T00:00:00Z",
      },
    };
    const { calls } = installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/challenges": { body: { challenges: [joined] } },
        [`GET /api/quizzes/${QUIZ_PUBLIC.id}`]: { body: QUIZ_PUBLIC },
        [`POST /api/quizzes/${QUIZ_PUBLIC.id}/submit`]: {
          body: { score: 2, total: 2, passed: true },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Take the quiz" }));
    const dialog = await screen.findByRole("dialog");
    await user.click((await within(dialog).findAllByRole("radio"))[1]!);
    await user.click(within(dialog).getByRole("button", { name: "Next question" }));
    await user.click(within(dialog).getAllByRole("radio")[0]!);
    await user.click(within(dialog).getByRole("button", { name: "Submit answers" }));

    expect(await within(dialog).findByText("You got 2 of 2 correct.")).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({
      answers: [
        { questionId: "q1", optionIndex: 1 },
        { questionId: "q2", optionIndex: 0 },
      ],
    });
  });

  it("shows the plain message when a redeem is refused for too few points", async () => {
    const reward = makeReward({ status: "available" });
    const { calls } = installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/rewards": { body: { rewards: [reward] } },
        [`POST /api/rewards/${reward.id}/redeem`]: error(
          "INSUFFICIENT_POINTS",
          "Not enough points",
        ),
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");

    const user = await openTab("Rewards");
    await user.click(await screen.findByRole("button", { name: "Redeem for 40 pts" }));

    expect(
      await screen.findByText("You do not have enough points for that yet."),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith("/redeem"))).toBe(true);
    expect(screen.queryByRole("dialog", { name: "Reward redeemed" })).not.toBeInTheDocument();
  });

  it("redeems a reward and shows the points left", async () => {
    const reward = makeReward({ status: "available" });
    installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/rewards": { body: { rewards: [reward] } },
        "GET /api/badges": { body: { badges: [makeBadge({ earned: true })] } },
        [`POST /api/rewards/${reward.id}/redeem`]: {
          body: {
            redemption: {
              rewardId: reward.id,
              title: reward.title,
              pointsSpent: 40,
              redeemedAt: "2026-10-19T00:00:00Z",
            },
            points: 60,
          },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");

    const user = await openTab("Rewards");
    await user.click(await screen.findByRole("button", { name: "Redeem for 40 pts" }));
    expect(await screen.findByText(/You have 60 points left/)).toBeInTheDocument();
    expect(screen.getByText("First steps")).toBeInTheDocument();
  });

  it("shows an empty leaderboard and saves the opt-in with PATCH /api/me", async () => {
    const { calls } = installFakeApi({
      ...signedInRoutes(VOLUNTEER),
      "PATCH /api/me": ({ body }) => ({ body: User.parse({ ...VOLUNTEER, ...(body as object) }) }),
    });
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");

    const user = await openTab("Leaderboard");
    expect(await screen.findByText("No one is on the leaderboard yet")).toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: /Show me on the leaderboard/ });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    expect(UpdateMeBody.parse(calls.find((c) => c.method === "PATCH")?.body)).toEqual({
      leaderboardOptIn: true,
    });
  });

  it("lists the leaderboard entries with the caller's row", async () => {
    installFakeApi(
      signedInRoutes(VOLUNTEER, {
        "GET /api/leaderboard": {
          body: {
            entries: [
              { rank: 1, displayName: "Aisha R", lifetimePoints: 300, isCurrentUser: false },
            ],
            me: { rank: 12, displayName: "Daniel L", lifetimePoints: 20, isCurrentUser: true },
          },
        },
      }),
    );
    signInAs(VOLUNTEER.id);
    renderApp("/community/challenges");

    await openTab("Leaderboard");
    const list = await screen.findByRole("list", { name: "Rankings" });
    expect(within(list).getByText("Aisha R")).toBeInTheDocument();
    expect(within(list).getByText(/Daniel L/)).toBeInTheDocument();
  });
});
