import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AccountSheet } from "./AccountSheet";
import { endPageLeave, pageIsLeaving } from "../../lib/pageLeave";

const signOut = vi.fn<() => Promise<void>>();
const assign = vi.fn();
const reload = vi.fn();

vi.mock("@sdh/api-client", () => ({ useSession: () => ({ user: undefined, signOut }) }));

beforeEach(() => {
  signOut.mockReset();
  signOut.mockResolvedValue(undefined);
  assign.mockReset();
  reload.mockReset();
  endPageLeave();
  vi.stubEnv("VITE_COGNITO_REGION", "ap-southeast-5");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "ap-southeast-5_test");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "client");
  vi.stubGlobal("location", { pathname: "/profile", search: "", hash: "", assign, reload });
});

afterEach(async () => {
  // Unmounting a sheet steps the history back asynchronously; let that land before the next test.
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 20));
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function openConfirm() {
  render(<AccountSheet onClose={() => {}} openerRef={{ current: null }} />);
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  return screen.getByRole("dialog", { name: "Sign out?" });
}

const listShown = () => screen.getByRole("dialog", { name: "Account" });

describe("Account sheet sign out step", () => {
  it("switches the drawer in place, with no second dialog", async () => {
    const dialog = await openConfirm();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(
      within(dialog).getByText("Are you sure you want to sign out?", { selector: "p:not([role])" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Yes, sign out" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Not yet" })).toHaveFocus();
    expect(within(dialog).queryByRole("link", { name: "Account settings" })).toBeNull();
  });

  it("returns to the Account list on Not yet", async () => {
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Not yet" }));
    expect(within(listShown()).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns to the Account list on Escape", async () => {
    await openConfirm();
    await userEvent.keyboard("{Escape}");
    expect(within(listShown()).getByRole("link", { name: "Account settings" })).toBeInTheDocument();
  });

  it("returns to the Account list on the first Back press and stays on the page", async () => {
    await openConfirm();
    window.history.back();
    await waitFor(() => expect(listShown()).toBeInTheDocument());
    // The sheet put its history entry back, so the next Back still has something to close.
    expect(window.history.state).toMatchObject({ sdhSheet: expect.any(String) });
  });

  it("signs out then leaves for the start page", async () => {
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(pageIsLeaving()).toBe(true);
  });

  it("disables both buttons and ignores Escape while signing out", async () => {
    let finish: () => void = () => {};
    signOut.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out" }));
    expect(screen.getByRole("button", { name: /Yes, sign out/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Not yet" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
    finish();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
  });

  it("stays on the confirm step with an error when the sign out fails, and can retry", async () => {
    signOut.mockRejectedValueOnce(new Error("offline"));
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not sign you out");
    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, sign out" })).toBeEnabled();
    expect(assign).not.toHaveBeenCalled();
    expect(pageIsLeaving()).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("stays locked on the confirm step after a successful sign out until the page unloads", async () => {
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out" }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yes, sign out/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Not yet" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Yes, sign out/ }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("labels the title row button Back on the confirm step and steps back with it", async () => {
    await openConfirm();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(within(listShown()).getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("gives focus back to Sign out when leaving the confirm step", async () => {
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Not yet" }));
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus();
  });

  it("announces the question through a live region that is already mounted", async () => {
    render(<AccountSheet onClose={() => {}} openerRef={{ current: null }} />);
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("");
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("Are you sure you want to sign out?");
  });

  it("reloads when the navigation to the start page fails", async () => {
    assign.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out" }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(pageIsLeaving()).toBe(false);
  });
});
