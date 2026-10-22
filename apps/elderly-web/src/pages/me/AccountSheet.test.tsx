import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccountSheet } from "./AccountSheet";
import { endPageLeave, pageIsLeaving } from "../../ui/pageLeave";

const signOut = vi.fn<() => Promise<void>>();
const assign = vi.fn();
const reload = vi.fn();

vi.mock("@sdh/api-client", () => ({ useSession: () => ({ signOut }) }));

beforeEach(() => {
  signOut.mockReset();
  signOut.mockResolvedValue(undefined);
  assign.mockReset();
  reload.mockReset();
  endPageLeave();
  vi.stubEnv("VITE_COGNITO_REGION", "ap-southeast-5");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "ap-southeast-5_test");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "client");
  vi.stubGlobal("location", { assign, reload });
});

afterEach(async () => {
  // Unmounting a sheet steps the history back asynchronously; let that land before the next test.
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 20));
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function openConfirm() {
  render(
    <MemoryRouter>
      <AccountSheet open onClose={() => {}} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  return screen.findByRole("dialog", { name: "Sign out?" });
}

async function confirmSignOut() {
  const confirm = await openConfirm();
  await userEvent.click(within(confirm).getByRole("button", { name: "Yes, sign out" }));
  return confirm;
}

describe("Account sheet sign out", () => {
  it("switches the drawer in place, with no second dialog", async () => {
    const confirm = await openConfirm();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(confirm).toHaveTextContent("You will need to sign in again to use Township Connect.");
    expect(within(confirm).getByRole("button", { name: "Yes, sign out" })).toBeEnabled();
    expect(within(confirm).getByRole("button", { name: "Not yet" })).toHaveFocus();
  });

  it("returns to the Account list on Not yet", async () => {
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Not yet" }));
    const list = screen.getByRole("dialog", { name: "Account" });
    expect(within(list).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns to the Account list on Escape", async () => {
    await openConfirm();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
  });

  it("returns to the Account list on the first Back press and keeps the sheet open", async () => {
    await openConfirm();
    window.history.back();
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument(),
    );
    expect(window.history.state).toMatchObject({ sdhSheet: expect.any(String) });
  });

  it("ignores Escape and Back while signing out", async () => {
    signOut.mockImplementation(() => new Promise<void>(() => {}));
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out" }));
    await userEvent.keyboard("{Escape}");
    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Signing out");
  });

  it("keeps Not yet off while signing out, then leaves to the start page", async () => {
    let finish: () => void = () => {};
    signOut.mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    const confirm = await confirmSignOut();
    expect(within(confirm).getByRole("button", { name: "Not yet" })).toBeDisabled();
    expect(assign).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
    expect(pageIsLeaving()).toBe(true);
  });
});

describe("Account sheet sign out recovery and focus", () => {
  it("moves focus onto the confirm view when sign out starts, not a disabled button", async () => {
    signOut.mockImplementation(() => new Promise<void>(() => {}));
    const confirm = await confirmSignOut();
    expect(confirm.querySelector(".call-confirm")).toHaveFocus();
    expect(document.activeElement).not.toBe(document.body);
  });

  it("unlocks the drawer, reloads and hands focus to Not yet when the navigation throws", async () => {
    assign.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    await confirmSignOut();
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(pageIsLeaving()).toBe(false);
    expect(screen.getByRole("button", { name: "Yes, sign out" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Not yet" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Not yet" }));
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
  });
});

describe("Account sheet Done button", () => {
  it("steps back to the list from the confirm step instead of closing the drawer", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <AccountSheet open onClose={onClose} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does nothing while signing out", async () => {
    signOut.mockImplementation(() => new Promise<void>(() => {}));
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <AccountSheet open onClose={onClose} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await userEvent.click(screen.getByRole("button", { name: "Yes, sign out" }));
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Sign out?" })).toBeInTheDocument();
  });

  it("closes the drawer from the Account list", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <AccountSheet open onClose={onClose} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("reopens on the Account list after the drawer was closed during the confirm step", async () => {
    const view = render(
      <MemoryRouter>
        <AccountSheet open onClose={() => {}} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    view.rerender(
      <MemoryRouter>
        <AccountSheet open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    view.rerender(
      <MemoryRouter>
        <AccountSheet open onClose={() => {}} />
      </MemoryRouter>,
    );
    const list = await screen.findByRole("dialog", { name: "Account" });
    expect(within(list).getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("gives focus back to Sign out when leaving the confirm step", async () => {
    await openConfirm();
    await userEvent.click(screen.getByRole("button", { name: "Not yet" }));
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus();
  });
});

describe("Account sheet switch person", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  function renderSwitch() {
    return render(
      <MemoryRouter>
        <AccountSheet open onClose={() => {}} />
      </MemoryRouter>,
    );
  }

  it("steps off the sheet entry first, then signs out and goes to the picker", async () => {
    renderSwitch();
    const back = vi.spyOn(window.history, "back");
    await userEvent.click(screen.getByRole("button", { name: "Switch person" }));
    expect(back).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    back.mockRestore();
  });

  it("does not step back when the sheet's history entry is already gone", async () => {
    renderSwitch();
    window.history.replaceState(null, "");
    const back = vi.spyOn(window.history, "back");
    await userEvent.click(screen.getByRole("button", { name: "Switch person" }));
    expect(back).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
    back.mockRestore();
  });

  it("leaves no armed listener behind when the sheet goes away before Back fires", async () => {
    const view = renderSwitch();
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    await userEvent.click(screen.getByRole("button", { name: "Switch person" }));
    view.unmount();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(signOut).not.toHaveBeenCalled();
    back.mockRestore();
  });
});
