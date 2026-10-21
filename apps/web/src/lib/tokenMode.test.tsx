import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInWithToken } from "@sdh/api-client/testing";

import { App } from "../App";
import { installFakeApi } from "../test/fakeApi";
import { endPageLeave, pageIsLeaving } from "../lib/pageLeave";
import { ELDER, VOLUNTEER } from "../test/fixtures";
import { signedInRoutes } from "../test/routes";

const assign = vi.fn();
const reload = vi.fn();

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
  reload.mockClear();
  // The flag is module state: start every test with the page not leaving.
  endPageLeave();
  vi.stubEnv("VITE_COGNITO_REGION", "ap-southeast-5");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "ap-southeast-5_test");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "client");
  vi.stubGlobal("location", {
    pathname: "/volunteer/community",
    search: "?x=1",
    hash: "#top",
    assign,
    reload,
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
    await userEvent.click(await screen.findByRole("button", { name: /^Account/ }));
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
    await userEvent.click(await screen.findByRole("button", { name: /^Account/ }));
    const link = await screen.findByRole("link", { name: "Account settings" });
    expect(link).toHaveAttribute("href", "/account");

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    // A yes/no confirmation now gates the sign-out action.
    await userEvent.click(await screen.findByRole("button", { name: "Yes, sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(signOut).toHaveBeenCalled();
  });

  async function signOutFromProfile() {
    installFakeApi({ ...liveRoutes, "GET /api/me": { body: VOLUNTEER } });
    const { signOut } = renderToken("/profile");
    await userEvent.click(await screen.findByRole("button", { name: /^Account/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    const yes = await screen.findByRole("button", { name: "Yes, sign out" });
    expect(pageIsLeaving()).toBe(false);
    await userEvent.click(yes);
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(pageIsLeaving()).toBe(true);
    // Let React finish unmounting the signed-in page and settle any follow-up navigation.
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { signOut };
  }

  it("leaves with one navigation to the sign-in page, not a second one to the last page", async () => {
    await signOutFromProfile();
    expect(assign.mock.calls).toEqual([["/"]]);
  });

  it("does not unwind the dialog history entries while the page is leaving", async () => {
    const back = vi.spyOn(window.history, "back");
    await signOutFromProfile();
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });

  it("leaves nothing locked or inert behind when the page unmounts", async () => {
    await signOutFromProfile();
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(document.querySelector("[inert]")).toBeNull();
  });

  it("clears the leaving mark when the navigation cannot start", async () => {
    assign.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    installFakeApi({ ...liveRoutes, "GET /api/me": { body: VOLUNTEER } });
    renderToken("/profile");
    await userEvent.click(await screen.findByRole("button", { name: /^Account/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    await userEvent.click(await screen.findByRole("button", { name: "Yes, sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalled());
    await waitFor(() => expect(pageIsLeaving()).toBe(false));
  });

  it("reloads when the signed-out page comes back from the back-forward cache", async () => {
    await signOutFromProfile();
    const event = new Event("pageshow");
    Object.defineProperty(event, "persisted", { value: true });
    window.dispatchEvent(event);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
