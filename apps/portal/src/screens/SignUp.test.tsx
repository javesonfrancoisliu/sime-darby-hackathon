import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  AUTH_ERROR_COPY,
  AuthError,
  confirmSignUp,
  resendSignUpCode,
  signIn,
  signUp,
} from "@sdh/auth";

import { PENDING_STORAGE_KEY } from "../lib/pending";
import { ME_PATH, setup } from "../test/harness";

const PASSWORD = "Secret123";

type T = ReturnType<typeof setup>;

async function chooseAndFill(t: T, role: "Elderly" | "Youth") {
  await t.user.click(await screen.findByRole("button", { name: new RegExp(`^${role}`) }));
  await t.user.type(await screen.findByLabelText("Your name"), "Mary Tan");
  await t.user.type(screen.getByLabelText("Email"), "mary@example.com");
  await t.user.type(screen.getByLabelText("Make a password"), PASSWORD);
  await t.user.click(screen.getByRole("button", { name: "Elmina Valley" }));
  await t.user.click(screen.getByRole("button", { name: "Create account" }));
}

function storageDump(): string {
  return JSON.stringify({ ...window.sessionStorage }) + JSON.stringify({ ...window.localStorage });
}

describe("sign up", () => {
  it("runs the full flow, posts the exact profile and never stores the password", async () => {
    const t = setup({ path: "/sign-up", me: null });
    await chooseAndFill(t, "Elderly");

    await waitFor(() => expect(t.path()).toBe("/sign-up/verify"));
    expect(signUp).toHaveBeenCalledWith("mary@example.com", PASSWORD);
    expect(JSON.parse(window.sessionStorage.getItem(PENDING_STORAGE_KEY) ?? "{}")).toEqual({
      role: "elder",
      name: "Mary Tan",
      precinct: "Elmina Valley",
      email: "mary@example.com",
    });
    expect(storageDump()).not.toContain(PASSWORD);

    await t.user.type(screen.getByLabelText("Code"), "123456");
    await t.user.click(screen.getByRole("button", { name: "Confirm and start" }));

    await waitFor(() => expect(t.appNavigations()).toEqual(["/elder/"]));
    expect(confirmSignUp).toHaveBeenCalledWith("mary@example.com", "123456");
    expect(signIn).toHaveBeenCalledWith("mary@example.com", PASSWORD);
    const posts = t.callsTo("POST", ME_PATH);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.body).toEqual({ role: "elder", name: "Mary Tan", precinct: "Elmina Valley" });
    expect(window.sessionStorage.getItem(PENDING_STORAGE_KEY)).toBeNull();
    expect(storageDump()).not.toContain(PASSWORD);
  });

  it("sends a youth to the Youth app", async () => {
    const t = setup({ path: "/sign-up", me: null });
    await chooseAndFill(t, "Youth");
    await t.user.type(await screen.findByLabelText("Code"), "123456");
    await t.user.click(screen.getByRole("button", { name: "Confirm and start" }));
    await waitFor(() => expect(t.appNavigations()).toEqual(["/volunteer/"]));
    expect(t.callsTo("POST", ME_PATH)[0]?.body).toMatchObject({ role: "volunteer" });
  });

  it("tells youth they can start helping straight away", async () => {
    setup({ path: "/sign-up" });
    expect(
      await screen.findByText(/Youth accounts can start helping neighbours as soon as you sign in/),
    ).toBeVisible();
  });

  it("shows the password rules live", async () => {
    const t = setup({ path: "/sign-up", me: null });
    await t.user.click(await screen.findByRole("button", { name: /^Elderly/ }));
    const rules = await screen.findByRole("list", { name: "Password rules" });
    expect(rules).toHaveTextContent("8 or more characters not yet");
    await t.user.type(screen.getByLabelText("Make a password"), "abcdefg1");
    expect(rules).toHaveTextContent("8 or more characters done");
    expect(rules).toHaveTextContent("A small letter done");
    expect(rules).toHaveTextContent("A number done");
  });

  it("does not send a weak password to the service", async () => {
    const t = setup({ path: "/sign-up", me: null });
    await t.user.click(await screen.findByRole("button", { name: /^Elderly/ }));
    await t.user.type(await screen.findByLabelText("Your name"), "Mary");
    await t.user.type(screen.getByLabelText("Email"), "mary@example.com");
    await t.user.type(screen.getByLabelText("Make a password"), "short");
    await t.user.click(screen.getByRole("button", { name: "Elmina East" }));
    await t.user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("follows all three rules");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("shows the plain copy when the email cannot be used", async () => {
    vi.mocked(signUp).mockRejectedValueOnce(new AuthError("EMAIL_TAKEN"));
    const t = setup({ path: "/sign-up", me: null });
    await chooseAndFill(t, "Elderly");
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_ERROR_COPY.EMAIL_TAKEN);
    expect(t.path()).toBe("/sign-up/details");
  });

  it("goes back to the role step when no role was chosen", async () => {
    const t = setup({ path: "/sign-up/details" });
    await waitFor(() => expect(t.path()).toBe("/sign-up"));
  });

  it("asks to sign in again when the page was reloaded before confirming", async () => {
    window.sessionStorage.setItem(
      PENDING_STORAGE_KEY,
      JSON.stringify({
        role: "elder",
        name: "Mary Tan",
        precinct: "Elmina Valley",
        email: "mary@example.com",
      }),
    );
    // A fresh page has no password in memory.
    const t = setup({ path: "/sign-up/verify", me: null });
    await t.user.type(await screen.findByLabelText("Code"), "123456");
    await t.user.click(screen.getByRole("button", { name: "Confirm and start" }));

    expect(
      await screen.findByText("Your email is confirmed. Sign in to finish setting up."),
    ).toBeVisible();
    expect(t.path()).toBe("/");
    expect(signIn).not.toHaveBeenCalled();
    expect(t.callsTo("POST", ME_PATH)).toHaveLength(0);
    // Details stay so the next step can prefill them.
    expect(window.sessionStorage.getItem(PENDING_STORAGE_KEY)).not.toBeNull();
  });

  it("shows the plain copy for a wrong code, resends on request and then succeeds", async () => {
    vi.mocked(confirmSignUp).mockRejectedValueOnce(new AuthError("CODE_MISMATCH"));
    const t = setup({ path: "/sign-up", me: null });
    await chooseAndFill(t, "Elderly");
    await t.user.type(await screen.findByLabelText("Code"), "000000");
    await t.user.click(screen.getByRole("button", { name: "Confirm and start" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_ERROR_COPY.CODE_MISMATCH);

    await t.user.click(screen.getByRole("button", { name: "Send a new code" }));
    expect(resendSignUpCode).toHaveBeenCalledWith("mary@example.com");
    expect(await screen.findByText("We sent you a new code.")).toBeVisible();

    await t.user.clear(screen.getByLabelText("Code"));
    await t.user.type(screen.getByLabelText("Code"), "123456");
    await t.user.click(screen.getByRole("button", { name: "Confirm and start" }));
    await waitFor(() => expect(t.appNavigations()).toEqual(["/elder/"]));
  });

  it("lets the person go back and fix a wrong email", async () => {
    const t = setup({ path: "/sign-up", me: null });
    await chooseAndFill(t, "Elderly");
    await t.user.click(
      await screen.findByRole("link", { name: "Wrong email? Go back and fix it" }),
    );
    expect(t.path()).toBe("/sign-up/details");
    expect(await screen.findByLabelText("Email")).toHaveValue("mary@example.com");
  });

  it("finishes setting up when the profile is missing after sign-in", async () => {
    window.sessionStorage.setItem(
      PENDING_STORAGE_KEY,
      JSON.stringify({ role: "volunteer", name: "Sam Lee", precinct: "Central Park" }),
    );
    const t = setup({ path: "/finish", signedIn: true, me: null });
    expect(await screen.findByLabelText("Your name")).toHaveValue("Sam Lee");
    expect(screen.getByRole("button", { name: "Youth" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Central Park" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await t.user.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(t.appNavigations()).toEqual(["/volunteer/"]));
    expect(t.callsTo("POST", ME_PATH)[0]?.body).toEqual({
      role: "volunteer",
      name: "Sam Lee",
      precinct: "Central Park",
    });
  });

  it("treats a profile that already exists as done", async () => {
    const t = setup({ path: "/finish", signedIn: true, me: null, profileAlreadyExists: true });
    await t.user.click(await screen.findByRole("button", { name: "Elderly" }));
    await t.user.type(screen.getByLabelText("Your name"), "Mary");
    await t.user.click(screen.getByRole("button", { name: "Elmina West" }));
    await t.user.click(screen.getByRole("button", { name: "Finish" }));
    await waitFor(() => expect(t.appNavigations()).toEqual(["/elder/"]));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
