import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccountSheet } from "./AccountSheet";
import { endPageLeave } from "../../ui/pageLeave";

const signOut = vi.fn<() => Promise<void>>();

// The real session swallows sign-out errors, so a rejection is simulated at the hook.
vi.mock("@sdh/api-client", () => ({ useSession: () => ({ signOut }) }));

beforeEach(() => {
  signOut.mockReset();
  endPageLeave();
  vi.stubEnv("VITE_COGNITO_REGION", "ap-southeast-5");
  vi.stubEnv("VITE_COGNITO_USER_POOL_ID", "ap-southeast-5_test");
  vi.stubEnv("VITE_COGNITO_CLIENT_ID", "client");
});

describe("Account sheet sign out", () => {
  it("keeps Not yet off while signing out and shows an error when it fails", async () => {
    let fail: (reason: Error) => void = () => {};
    signOut.mockImplementation(() => new Promise<void>((_, reject) => (fail = reject)));
    render(
      <MemoryRouter>
        <AccountSheet open onClose={() => {}} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    const confirm = await screen.findByRole("dialog", { name: "Sign out?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Yes, sign out" }));
    expect(within(confirm).getByRole("button", { name: "Not yet" })).toBeDisabled();
    expect(within(confirm).queryByRole("alert")).not.toBeInTheDocument();

    fail(new Error("offline"));
    expect(await within(confirm).findByRole("alert")).toHaveTextContent(/could not sign you out/i);
    expect(within(confirm).getByRole("button", { name: "Not yet" })).toBeEnabled();
    expect(within(confirm).getByRole("button", { name: "Yes, sign out" })).toBeEnabled();
  });
});
