import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSession } from "@sdh/api-client";

import { installFakeApi } from "../test/fakeApi";
import { makeEvent, OTHER_VOLUNTEER, VOLUNTEER } from "../test/fixtures";
import { sessionWrapper } from "../test/wrapper";
import { useCommunityItems } from "./useCommunityItems";

describe("useCommunityItems", () => {
  it("shows loading again when the user changes and keeps joined flags per user", async () => {
    installFakeApi({
      "GET /api/me": ({ headers }) => ({
        body: headers["x-demo-user"] === OTHER_VOLUNTEER.id ? OTHER_VOLUNTEER : VOLUNTEER,
      }),
      "GET /api/events": ({ headers }) => ({
        body: {
          events: [makeEvent({ joined: headers["x-demo-user"] === VOLUNTEER.id })],
        },
      }),
    });
    const { result } = renderHook(() => ({ items: useCommunityItems(), session: useSession() }), {
      wrapper: sessionWrapper,
    });
    await waitFor(() => expect(result.current.items.loading).toBe(false));

    act(() => result.current.session.signIn(VOLUNTEER.id));
    expect(result.current.items.loading).toBe(true);
    await waitFor(() => expect(result.current.items.loading).toBe(false));
    const joined = (): boolean | undefined => {
      const event = result.current.items.items.find((i) => i.title === "Tea morning");
      return event?.category === "event" ? event.joined : undefined;
    };
    expect(joined()).toBe(true);

    act(() => result.current.session.signIn(OTHER_VOLUNTEER.id));
    expect(result.current.items.loading).toBe(true);
    await waitFor(() => expect(result.current.items.loading).toBe(false));
    expect(joined()).toBe(false);
  });
});
