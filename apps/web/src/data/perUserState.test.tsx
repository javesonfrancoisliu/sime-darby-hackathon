import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";

import { SessionProvider, useSession } from "@sdh/api-client";

import { UserScope } from "../components/layout";
import { installFakeApi } from "../test/fakeApi";
import { OTHER_VOLUNTEER, VOLUNTEER } from "../test/fixtures";
import { GamificationProvider, useGamification } from "./useGamification";

const CHALLENGE_ID = "chl-eco-quiz";

let session: ReturnType<typeof useSession>;

function SessionHandle() {
  const value = useSession();
  useEffect(() => {
    session = value;
  });
  return null;
}

function Probe() {
  const { progress, join } = useGamification();
  return (
    <div>
      <span data-testid="joined">{Object.keys(progress).join(",")}</span>
      <button type="button" onClick={() => join(CHALLENGE_ID)}>
        join
      </button>
    </div>
  );
}

function mount() {
  installFakeApi({
    [`GET /api/me`]: ({ headers }) => ({
      body: headers["x-demo-user"] === OTHER_VOLUNTEER.id ? OTHER_VOLUNTEER : VOLUNTEER,
    }),
  });
  render(
    <SessionProvider>
      <UserScope>
        <GamificationProvider>
          <SessionHandle />
          <Probe />
        </GamificationProvider>
      </UserScope>
    </SessionProvider>,
  );
}

describe("per-user persisted state", () => {
  it("does not carry progress to the next user and clears it on sign out", async () => {
    mount();
    await act(async () => session.signIn(VOLUNTEER.id));
    act(() => screen.getByRole("button", { name: "join" }).click());
    expect(screen.getByTestId("joined")).toHaveTextContent(CHALLENGE_ID);
    expect(window.localStorage.getItem(`tc.challenge.progress:${VOLUNTEER.id}`)).toContain(
      CHALLENGE_ID,
    );

    await act(async () => session.signIn(OTHER_VOLUNTEER.id));
    expect(screen.getByTestId("joined")).toBeEmptyDOMElement();

    await act(async () => session.signIn(VOLUNTEER.id));
    expect(screen.getByTestId("joined")).toHaveTextContent(CHALLENGE_ID);

    await act(async () => session.signOut());
    expect(screen.getByTestId("joined")).toBeEmptyDOMElement();
    const leftovers = Object.keys(window.localStorage).filter((k) => k.startsWith("tc.challenge"));
    expect(leftovers).toEqual(["tc.challenge.progress:signed-out"]);
  });

  it("keeps working when storage writes throw", async () => {
    mount();
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
    try {
      await act(async () => session.signIn(VOLUNTEER.id));
      act(() => screen.getByRole("button", { name: "join" }).click());
      expect(screen.getByTestId("joined")).toHaveTextContent(CHALLENGE_ID);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
