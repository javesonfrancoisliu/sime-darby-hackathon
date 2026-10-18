import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { signInWithToken } from "@sdh/api-client/testing";
import { App } from "../App";
import { installFakeApi } from "../test/fakeApi";
import { ELDER } from "../test/fixtures";

const assign = vi.fn();

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
    pathname: "/elder/requests",
    search: "?tab=open",
    hash: "",
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
        `/?next=${encodeURIComponent("/elder/requests?tab=open")}`,
      ),
    );
    expect(screen.queryByText("Who is using this phone?")).not.toBeInTheDocument();
  });

  it("sends someone without a profile to finish setup", async () => {
    installFakeApi({
      "GET /api/me": { status: 403, body: { error: { code: "PROFILE_REQUIRED", message: "x" } } },
    });
    renderToken("/home");
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/finish"));
  });

  it("sends a volunteer to the volunteer app", async () => {
    installFakeApi({ "GET /api/me": { body: { ...ELDER, role: "volunteer" } } });
    renderToken("/home");
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/volunteer/"));
  });

  it("shows the app to a resident without redirecting", async () => {
    installFakeApi();
    renderToken("/me");
    expect(await screen.findByRole("heading", { name: "Puan Salmah" })).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("offers a retry when the details cannot load", async () => {
    installFakeApi({
      "GET /api/me": { status: 500, body: { error: { code: "INTERNAL", message: "x" } } },
    });
    renderToken("/home");
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("token mode account actions", () => {
  it("links to account settings and signs out to the sign-in page", async () => {
    installFakeApi();
    const { signOut } = renderToken("/me");
    const link = await screen.findByRole("link", { name: "Account settings" });
    expect(link).toHaveAttribute("href", "/account");
    expect(screen.queryByRole("button", { name: "Switch person" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(signOut).toHaveBeenCalled();
  });
});
