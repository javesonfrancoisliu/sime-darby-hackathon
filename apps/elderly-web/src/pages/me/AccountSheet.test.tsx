import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function confirmSignOut() {
  render(
    <MemoryRouter>
      <AccountSheet open onClose={() => {}} />
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  const confirm = await screen.findByRole("dialog", { name: "Sign out?" });
  await userEvent.click(within(confirm).getByRole("button", { name: "Yes, sign out" }));
  return confirm;
}

describe("Account sheet sign out", () => {
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
