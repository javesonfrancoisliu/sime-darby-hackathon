import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AuthError,
  changeEmail,
  confirmEmailChange,
  resendEmailChangeCode,
  signIn,
} from "@sdh/auth";

import { ME_PATH, makeUser, setup, userFor } from "../test/harness";

describe("account page", () => {
  it("shows the name, confirmed email, hidden password, role and area", async () => {
    setup({
      path: "/account",
      signedIn: true,
      me: makeUser({ name: "Auntie Mary", area: "Elmina West" }),
    });
    expect(await screen.findByText("Auntie Mary")).toBeVisible();
    expect(await screen.findByText("mary@example.com")).toBeVisible();
    expect(screen.getByText("Confirmed")).toBeVisible();
    expect(screen.getByLabelText("Hidden")).toBeVisible();
    expect(screen.getByText("Elderly")).toBeVisible();
    expect(
      screen.getByText("Your role comes with your account. To change it, ask a coordinator."),
    ).toBeVisible();
    expect(screen.getByText("Elmina West")).toBeVisible();
    expect(document.title).toBe("Your account - Help a Neighbour");
  });

  it("labels the youth role as Youth", async () => {
    setup({ path: "/account", signedIn: true, me: userFor("volunteer") });
    expect(await screen.findByText("Youth")).toBeVisible();
  });

  it("links back to the person's own app", async () => {
    setup({ path: "/account", signedIn: true, me: userFor("volunteer") });
    expect(await screen.findByRole("link", { name: "Back to my app" })).toHaveAttribute(
      "href",
      "/volunteer/",
    );
  });

  it("signs out and returns to sign-in", async () => {
    const t = setup({ path: "/account", signedIn: true, me: userFor("elder") });
    await t.user.click(await screen.findByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(t.appNavigations()).toEqual(["/"]));
    expect(t.signOut).toHaveBeenCalledTimes(1);
  });

  it("sends a signed-out visitor to sign in and then back here", async () => {
    const t = setup({ path: "/account" });
    await waitFor(() => expect(t.path()).toBe("/?next=%2Faccount"));
  });

  it("sends a signed-in visitor with no profile to finish setting up", async () => {
    const t = setup({ path: "/account", signedIn: true, me: null });
    await waitFor(() => expect(t.path()).toBe("/finish"));
  });

  it("returns to the account page after signing in from an account link", async () => {
    const t = setup({ path: "/?next=%2Faccount", me: userFor("elder") });
    await t.user.type(await screen.findByLabelText("Email"), "mary@example.com");
    await t.user.type(screen.getByLabelText("Password"), "Secret123");
    await t.user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(t.path()).toBe("/account"));
    expect(t.appNavigations()).toEqual([]);
  });
});

describe("change name", () => {
  it("saves the new name with PATCH and shows it on the account page", async () => {
    const t = setup({
      path: "/account/name",
      signedIn: true,
      me: makeUser({ name: "Auntie Mary" }),
    });
    await t.user.type(await screen.findByLabelText("New name"), "  Mary Tan ");
    await t.user.click(screen.getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(t.path()).toBe("/account"));
    const patches = t.callsTo("PATCH", ME_PATH);
    expect(patches).toHaveLength(1);
    expect(patches[0]?.body).toEqual({ name: "Mary Tan" });
    expect(await screen.findByText("Mary Tan")).toBeVisible();
  });

  it("asks for a name instead of sending an empty one", async () => {
    const t = setup({ path: "/account/name", signedIn: true, me: userFor("elder") });
    await t.user.click(await screen.findByRole("button", { name: "Save name" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please type your name.");
    expect(t.callsTo("PATCH", ME_PATH)).toHaveLength(0);
  });
});

describe("change email", () => {
  async function submit(t: ReturnType<typeof setup>) {
    await t.user.type(await screen.findByLabelText("New email"), "new@example.com");
    await t.user.type(screen.getByLabelText("Your password"), "Secret123");
    await t.user.click(screen.getByRole("button", { name: "Send code to new email" }));
  }

  it("re-checks the password, then sends a code to the new email", async () => {
    const t = setup({ path: "/account/email", signedIn: true, me: userFor("elder") });
    await submit(t);
    await waitFor(() => expect(t.path()).toBe("/account/email/verify"));
    expect(signIn).toHaveBeenCalledWith("mary@example.com", "Secret123");
    expect(changeEmail).toHaveBeenCalledWith("new@example.com");
    const order = [
      vi.mocked(signIn).mock.invocationCallOrder[0] ?? 0,
      vi.mocked(changeEmail).mock.invocationCallOrder[0] ?? 0,
    ];
    expect(order[0]).toBeLessThan(order[1] ?? 0);
    expect(screen.getByText("new@example.com")).toBeInTheDocument();
  });

  it("does not change anything when the password is wrong", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new AuthError("INVALID_CREDENTIALS"));
    const t = setup({ path: "/account/email", signedIn: true, me: userFor("elder") });
    await submit(t);
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(changeEmail).not.toHaveBeenCalled();
    expect(t.path()).toBe("/account/email");
  });

  it("confirms the code, can resend it, and then tells the person to use the new email", async () => {
    const t = setup({ path: "/account/email", signedIn: true, me: userFor("elder") });
    await submit(t);
    await t.user.click(await screen.findByRole("button", { name: "Send a new code" }));
    expect(resendEmailChangeCode).toHaveBeenCalledTimes(1);
    await t.user.type(screen.getByLabelText("Code"), "654321");
    await t.user.click(screen.getByRole("button", { name: "Confirm new email" }));
    await waitFor(() => expect(t.path()).toBe("/account"));
    expect(confirmEmailChange).toHaveBeenCalledWith("654321");
    const status = await screen.findByRole("status");
    expect(within(status).getByText(/Use your new email to sign in/)).toBeVisible();
  });
});
