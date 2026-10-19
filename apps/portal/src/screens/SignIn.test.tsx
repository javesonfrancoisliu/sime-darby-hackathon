import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AUTH_ERROR_COPY, AuthError, resendSignUpCode, signIn } from "@sdh/auth";

import { setup, userFor } from "../test/harness";

async function fillAndSubmit(
  user: ReturnType<typeof setup>["user"],
  email = "mary@example.com",
  password = "Secret123",
) {
  await user.type(await screen.findByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("sign in", () => {
  it("sends an elder to the Elderly app", async () => {
    const t = setup({ me: userFor("elder") });
    await fillAndSubmit(t.user);
    await waitFor(() => expect(t.appNavigations()).toEqual(["/elder/"]));
    expect(signIn).toHaveBeenCalledWith("mary@example.com", "Secret123");
  });

  it("sends a youth to the Youth app", async () => {
    const t = setup({ me: userFor("volunteer") });
    await fillAndSubmit(t.user);
    await waitFor(() => expect(t.appNavigations()).toEqual(["/volunteer/"]));
  });

  it("follows a safe next link inside the person's own app", async () => {
    const t = setup({ me: userFor("elder"), path: "/?next=%2Felder%2Frequests" });
    await fillAndSubmit(t.user);
    await waitFor(() => expect(t.appNavigations()).toEqual(["/elder/requests"]));
  });

  it("ignores a next link that points into the other app or off site", async () => {
    const other = setup({ me: userFor("elder"), path: "/?next=%2Fvolunteer%2Fevents" });
    await fillAndSubmit(other.user);
    await waitFor(() => expect(other.appNavigations()).toEqual(["/elder/"]));
  });

  it("ignores an off-site next link", async () => {
    const t = setup({ me: userFor("volunteer"), path: "/?next=%2F%2Fevil.example%2Fx" });
    await fillAndSubmit(t.user);
    await waitFor(() => expect(t.appNavigations()).toEqual(["/volunteer/"]));
  });

  it("sends people with no profile yet to finish setting up", async () => {
    const t = setup({ me: null });
    await fillAndSubmit(t.user);
    await waitFor(() => expect(t.path()).toBe("/finish"));
    expect(t.appNavigations()).toEqual([]);
  });

  it("redirects by role when already signed in", async () => {
    const t = setup({ me: userFor("volunteer"), signedIn: true });
    await waitFor(() => expect(t.appNavigations()).toEqual(["/volunteer/"]));
  });

  it("shows the wrong-password copy as an alert and offers a reset", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new AuthError("INVALID_CREDENTIALS"));
    const t = setup();
    await fillAndSubmit(t.user);
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_ERROR_COPY.INVALID_CREDENTIALS);
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("link", { name: "Reset my password" })).toHaveAttribute(
      "href",
      "/forgot",
    );
    expect(t.appNavigations()).toEqual([]);
  });

  it("sends an unconfirmed email a new code and goes to the verify page", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new AuthError("NOT_CONFIRMED"));
    const t = setup();
    await fillAndSubmit(t.user);
    await waitFor(() => expect(t.path()).toBe("/sign-up/verify"));
    expect(resendSignUpCode).toHaveBeenCalledWith("mary@example.com");
    expect(screen.getByText("mary@example.com")).toBeInTheDocument();
  });

  it("never shows raw error text", async () => {
    vi.mocked(signIn).mockRejectedValueOnce(new Error("raw boom from the service"));
    const t = setup();
    await fillAndSubmit(t.user);
    const alert = await screen.findByRole("alert");
    expect(alert).not.toHaveTextContent("raw boom");
  });

  it("shows and hides the password", async () => {
    const t = setup();
    const field = await screen.findByLabelText("Password");
    expect(field).toHaveAttribute("type", "password");
    await t.user.click(screen.getByRole("button", { name: "Show password" }));
    expect(field).toHaveAttribute("type", "text");
    await t.user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field).toHaveAttribute("type", "password");
  });

  it("focuses the heading and sets the tab title", async () => {
    setup();
    const heading = await screen.findByRole("heading", { level: 1, name: "Township Connect" });
    expect(heading).toHaveFocus();
    expect(document.title).toBe("Sign in - Township Connect");
  });
});
