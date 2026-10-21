import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  async function openAccount() {
    installFakeApi();
    const view = renderToken("/me");
    await userEvent.click(await screen.findByRole("button", { name: /^Account/ }));
    return { ...view, sheet: await screen.findByRole("dialog", { name: "Account" }) };
  }

  it("keeps Account settings and Sign out inside the Account sheet only", async () => {
    installFakeApi();
    renderToken("/me");
    await screen.findByRole("button", { name: /^Account/ });
    expect(screen.queryByRole("link", { name: "Account settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("links to account settings and asks before signing out", async () => {
    const { signOut, sheet } = await openAccount();
    const link = within(sheet).getByRole("link", { name: "Account settings" });
    expect(link).toHaveAttribute("href", "/account");
    expect(within(sheet).queryByRole("button", { name: "Switch person" })).not.toBeInTheDocument();

    await userEvent.click(within(sheet).getByRole("button", { name: "Sign out" }));
    const confirm = await screen.findByRole("dialog", { name: "Sign out?" });
    expect(signOut).not.toHaveBeenCalled();
    await userEvent.click(within(confirm).getByRole("button", { name: "Yes, sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(signOut).toHaveBeenCalled();
  });

  it("keeps the person signed in on Not yet and leaves the Account sheet open", async () => {
    const { signOut, sheet } = await openAccount();
    await userEvent.click(within(sheet).getByRole("button", { name: "Sign out" }));
    const confirm = await screen.findByRole("dialog", { name: "Sign out?" });
    expect(within(confirm).getByRole("button", { name: "Not yet" })).toHaveFocus();
    await userEvent.click(within(confirm).getByRole("button", { name: "Not yet" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Sign out?" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("closes the confirm first on Escape and on the phone Back button", async () => {
    const { sheet } = await openAccount();
    await userEvent.click(within(sheet).getByRole("button", { name: "Sign out" }));
    await screen.findByRole("dialog", { name: "Sign out?" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Sign out?" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Account" })).getByRole("button", {
        name: "Sign out",
      }),
    );
    await screen.findByRole("dialog", { name: "Sign out?" });
    window.history.back();
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Sign out?" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
  });
});
