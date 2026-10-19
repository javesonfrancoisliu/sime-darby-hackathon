import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInWithToken } from "@sdh/api-client/testing";

import { App } from "../App";
import { installFakeApi } from "../test/fakeApi";
import { ELDER, VOLUNTEER } from "../test/fixtures";
import { signedInRoutes } from "../test/routes";

const assign = vi.fn();

const liveRoutes = signedInRoutes(VOLUNTEER);

function renderToken(path: string, signOut = vi.fn(async () => {})) {
  const auth = { getAccessToken: async () => "tok", signOut };
  render(
    <MemoryRouter initialEntries={[path]}>
      <App auth={auth} />
    </MemoryRouter>,
  );
  return { signOut };
}

beforeEach(() => {
  assign.mockClear();
  vi.stubEnv("VITE_COGNITO_REGION", "ap-southeast-5");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "ap-southeast-5_test");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "client");
  vi.stubGlobal("location", {
    pathname: "/volunteer/community",
    search: "?x=1",
    hash: "#top",
    assign,
  });
  signInWithToken();
});

afterEach(() => vi.unstubAllGlobals());

describe("token mode guard", () => {
  it("sends a signed-out person to sign-in with the page they wanted", async () => {
    const auth = { getAccessToken: async () => null, signOut: async () => {} };
    render(
      <MemoryRouter>
        <App auth={auth} />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        `/?next=${encodeURIComponent("/volunteer/community?x=1#top")}`,
      ),
    );
  });

  it("sends someone without a profile to finish setup", async () => {
    installFakeApi({
      "GET /api/me": { status: 403, body: { error: { code: "PROFILE_REQUIRED", message: "x" } } },
    });
    renderToken("/");
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/finish"));
  });

  it("sends a resident to the elderly app", async () => {
    installFakeApi({ ...liveRoutes, "GET /api/me": { body: ELDER } });
    renderToken("/");
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/elder/"));
  });

  it("shows the app to a volunteer without redirecting", async () => {
    installFakeApi({ ...liveRoutes, "GET /api/me": { body: VOLUNTEER } });
    renderToken("/profile");
    expect(await screen.findByRole("link", { name: "Account settings" })).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Local sign-in")).not.toBeInTheDocument();
  });

  it("offers a retry when the details cannot load", async () => {
    installFakeApi({
      "GET /api/me": { status: 500, body: { error: { code: "INTERNAL", message: "x" } } },
    });
    renderToken("/");
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("token mode account actions", () => {
  it("links to account settings and signs out to the sign-in page", async () => {
    installFakeApi({ ...liveRoutes, "GET /api/me": { body: VOLUNTEER } });
    const { signOut } = renderToken("/profile");
    const link = await screen.findByRole("link", { name: "Account settings" });
    expect(link).toHaveAttribute("href", "/account");

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    // A yes/no confirmation now gates the sign-out action.
    await userEvent.click(await screen.findByRole("button", { name: "Yes, sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(signOut).toHaveBeenCalled();
  });
});
