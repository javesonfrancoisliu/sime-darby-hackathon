import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AUTH_ERROR_COPY,
  AuthError,
  changePassword,
  confirmForgotPassword,
  forgotPassword,
} from "@sdh/auth";

import { setup, userFor } from "../test/harness";

describe("forgot and reset password", () => {
  async function toResetPage(t: ReturnType<typeof setup>) {
    await t.user.type(await screen.findByLabelText("Email"), "mary@example.com");
    await t.user.click(screen.getByRole("button", { name: "Send me a code" }));
    await waitFor(() => expect(t.path()).toBe("/reset"));
  }

  it("sends a code and shows the reset page for that email", async () => {
    const t = setup({ path: "/forgot" });
    await toResetPage(t);
    expect(forgotPassword).toHaveBeenCalledWith("mary@example.com");
    expect(screen.getByText("mary@example.com")).toBeInTheDocument();
  });

  it("blocks a new password that does not match the retyped one", async () => {
    const t = setup({ path: "/forgot" });
    await toResetPage(t);
    await t.user.type(screen.getByLabelText("Code from the email"), "123456");
    await t.user.type(screen.getByLabelText("New password"), "Newpass123");
    await t.user.type(screen.getByLabelText("Type it again"), "Newpass124");
    await t.user.click(screen.getByRole("button", { name: "Save and sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("not the same");
    expect(confirmForgotPassword).not.toHaveBeenCalled();
  });

  it("blocks a password that breaks the rules", async () => {
    const t = setup({ path: "/forgot" });
    await toResetPage(t);
    await t.user.type(screen.getByLabelText("Code from the email"), "123456");
    await t.user.type(screen.getByLabelText("New password"), "nodigitshere");
    await t.user.type(screen.getByLabelText("Type it again"), "nodigitshere");
    await t.user.click(screen.getByRole("button", { name: "Save and sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("three rules");
    expect(confirmForgotPassword).not.toHaveBeenCalled();
  });

  it("changes the password and returns to sign-in with a message", async () => {
    const t = setup({ path: "/forgot" });
    await toResetPage(t);
    await t.user.type(screen.getByLabelText("Code from the email"), "123456");
    await t.user.type(screen.getByLabelText("New password"), "Newpass123");
    await t.user.type(screen.getByLabelText("Type it again"), "Newpass123");
    await t.user.click(screen.getByRole("button", { name: "Save and sign in" }));
    expect(await screen.findByText("Your password is changed. Please sign in.")).toBeVisible();
    expect(t.path()).toBe("/");
    expect(confirmForgotPassword).toHaveBeenCalledWith("mary@example.com", "123456", "Newpass123");
  });

  it("shows plain copy when the code is wrong", async () => {
    vi.mocked(confirmForgotPassword).mockRejectedValueOnce(new AuthError("CODE_MISMATCH"));
    const t = setup({ path: "/forgot" });
    await toResetPage(t);
    await t.user.type(screen.getByLabelText("Code from the email"), "123456");
    await t.user.type(screen.getByLabelText("New password"), "Newpass123");
    await t.user.type(screen.getByLabelText("Type it again"), "Newpass123");
    await t.user.click(screen.getByRole("button", { name: "Save and sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_ERROR_COPY.CODE_MISMATCH);
  });

  it("sends the reset page back to the start when it has no email", async () => {
    const t = setup({ path: "/reset" });
    await waitFor(() => expect(t.path()).toBe("/forgot"));
  });
});

describe("change password", () => {
  async function fill(t: ReturnType<typeof setup>, again = "Newpass123") {
    await t.user.type(await screen.findByLabelText("Current password"), "Oldpass123");
    await t.user.type(screen.getByLabelText("New password"), "Newpass123");
    await t.user.type(screen.getByLabelText("Type it again"), again);
    await t.user.click(screen.getByRole("button", { name: "Save new password" }));
  }

  it("changes the password and returns to the account page", async () => {
    const t = setup({ path: "/account/password", signedIn: true, me: userFor("elder") });
    await fill(t);
    expect(await screen.findByText("Your password is changed.")).toBeVisible();
    expect(t.path()).toBe("/account");
    expect(changePassword).toHaveBeenCalledWith("Oldpass123", "Newpass123");
  });

  it("does not call the service when the two new passwords differ", async () => {
    const t = setup({ path: "/account/password", signedIn: true, me: userFor("elder") });
    await fill(t, "Different123");
    expect(await screen.findByRole("alert")).toHaveTextContent("not the same");
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("shows plain copy when the current password is wrong", async () => {
    vi.mocked(changePassword).mockRejectedValueOnce(new AuthError("INVALID_CREDENTIALS"));
    const t = setup({ path: "/account/password", signedIn: true, me: userFor("elder") });
    await fill(t);
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_ERROR_COPY.INVALID_CREDENTIALS);
    expect(t.path()).toBe("/account/password");
  });
});
