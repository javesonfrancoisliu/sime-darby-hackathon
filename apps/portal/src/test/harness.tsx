import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { vi } from "vitest";

import { SessionProvider } from "@sdh/api-client";
import { installFakeApi, type Call } from "@sdh/api-client/testing";
import { getAccountEmail, signIn } from "@sdh/auth";
import type { CreateMeBody, Role, User } from "@sdh/contracts";

import { App } from "../App";
import { navigateToApp } from "../lib/navigate";

export const ME_PATH = "/api/me";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    name: "Auntie Mary",
    role: "elder",
    area: "Elmina West",
    location: { lat: 3.07, lng: 101.51 },
    skills: [],
    experience: "",
    availability: [],
    verification: "not_required",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function userFor(role: Role, name = "Test Person"): User {
  return makeUser({ role, name, verification: role === "volunteer" ? "pending" : "not_required" });
}

type Options = {
  path?: string;
  // The profile the API holds; null means signed in with no profile yet.
  me?: User | null;
  // Start with a valid access token.
  signedIn?: boolean;
  // POST /api/me answers 409 because the profile already exists.
  profileAlreadyExists?: boolean;
};

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  const location = useLocation();
  onChange(`${location.pathname}${location.search}`);
  return null;
}

// Renders the whole app with a fake session, fake API and mocked Cognito actions.
export function setup(options: Options = {}) {
  const state = {
    token: options.signedIn ? "test-token" : (null as string | null),
    me: options.me === undefined ? null : options.me,
    path: options.path ?? "/",
  };
  const signOut = vi.fn(async () => {
    state.token = null;
  });
  const auth = { getAccessToken: async () => state.token, signOut };

  vi.mocked(signIn).mockImplementation(async () => {
    state.token = "test-token";
  });
  vi.mocked(getAccountEmail).mockResolvedValue({ email: "mary@example.com", emailVerified: true });

  const api = installFakeApi({
    [`GET ${ME_PATH}`]: () =>
      state.me
        ? { body: state.me }
        : { status: 403, body: { error: { code: "PROFILE_REQUIRED", message: "x" } } },
    [`POST ${ME_PATH}`]: (call: Call) => {
      const body = call.body as CreateMeBody;
      state.me = makeUser({ role: body.role, name: body.name, area: body.precinct });
      if (options.profileAlreadyExists) {
        return { status: 409, body: { error: { code: "CONFLICT", message: "exists" } } };
      }
      return { status: 201, body: state.me };
    },
    [`PATCH ${ME_PATH}`]: (call: Call) => {
      state.me = makeUser({ ...state.me, ...(call.body as Partial<User>) });
      return { body: state.me };
    },
  });

  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[state.path]}>
      <SessionProvider auth={auth}>
        <App />
        <LocationProbe
          onChange={(path) => {
            state.path = path;
          }}
        />
      </SessionProvider>
    </MemoryRouter>,
  );

  return {
    user,
    api,
    state,
    signOut,
    path: () => state.path,
    appNavigations: () => vi.mocked(navigateToApp).mock.calls.map(([target]) => target),
    callsTo: (method: string, path: string) =>
      api.calls.filter((call) => call.method === method && call.path === path),
  };
}
