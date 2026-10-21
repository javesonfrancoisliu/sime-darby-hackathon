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

  it("reloads and clears the leaving mark when the navigation cannot start", async () => {
    assign.mockImplementationOnce(() => {
      throw new Error("blocked");
    });
    await confirmSignOut();
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(pageIsLeaving()).toBe(false);
  });
});
