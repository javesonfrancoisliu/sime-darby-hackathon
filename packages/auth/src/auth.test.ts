import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  authConfigFromEnv,
  AUTH_ERROR_COPY,
  AUTH_STORAGE_KEY,
  AuthError,
  changeEmail,
  changePassword,
  checkPassword,
  configureAuth,
  confirmEmailChange,
  confirmForgotPassword,
  confirmSignUp,
  forgotPassword,
  getAccessToken,
  getAccountEmail,
  isAuthConfigured,
  isSignedIn,
  REFRESH_THRESHOLD_MS,
  resendEmailChangeCode,
  resendSignUpCode,
  setCognitoSendForTests,
  signIn,
  signOut,
  signUp,
  type AuthErrorCode,
} from "./index";

const CLIENT_ID = "client-1";
const config = { region: "ap-southeast-1", userPoolId: "pool-1", clientId: CLIENT_ID };
const HOUR_MS = 60 * 60 * 1000;

type Sent = { name: string; input: Record<string, unknown> };

function sdkError(name: string, message = "x") {
  const err = new Error(message);
  err.name = name;
  return err;
}

function at(sent: Sent[], index: number): Sent {
  const entry = sent[index];
  if (!entry) throw new Error(`no command sent at ${index}`);
  return entry;
}

function install(handler: (sent: Sent) => unknown) {
  const sent: Sent[] = [];
  setCognitoSendForTests(async (command) => {
    const entry = {
      name: command.constructor.name,
      input: (command as { input: Record<string, unknown> }).input,
    };
    sent.push(entry);
    return handler(entry);
  });
  return sent;
}

function storeSession(overrides: Partial<Record<string, unknown>> = {}) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      accessToken: "old-access",
      idToken: "old-id",
      refreshToken: "old-refresh",
      expiresAt: Date.now() + HOUR_MS,
      ...overrides,
    }),
  );
}

const stored = () => JSON.parse(window.localStorage.getItem(AUTH_STORAGE_KEY) ?? "null");

beforeEach(() => {
  window.localStorage.clear();
  configureAuth(config);
});
afterEach(() => {
  setCognitoSendForTests(null);
  configureAuth(undefined);
  vi.restoreAllMocks();
});

describe("config", () => {
  it("reads the Vite env and needs all three values", () => {
    expect(
      authConfigFromEnv({
        VITE_COGNITO_REGION: "r",
        VITE_COGNITO_USER_POOL_ID: "p",
        VITE_COGNITO_CLIENT_ID: "c",
      }),
    ).toEqual({ region: "r", userPoolId: "p", clientId: "c" });
    expect(authConfigFromEnv({ VITE_COGNITO_REGION: "r" })).toBeUndefined();
    expect(authConfigFromEnv({})).toBeUndefined();
  });

  it("reports whether auth is configured", () => {
    expect(isAuthConfigured()).toBe(true);
    configureAuth(undefined);
    expect(isAuthConfigured()).toBe(false);
  });

  it("returns no token and fails actions when unconfigured", async () => {
    storeSession();
    configureAuth(undefined);
    expect(await getAccessToken()).toBeNull();
    await expect(signIn("a@b.co", "pw")).rejects.toMatchObject({ code: "UNKNOWN" });
  });
});

describe("signIn", () => {
  it("stores tokens from USER_PASSWORD_AUTH", async () => {
    const sent = install(() => ({
      AuthenticationResult: {
        AccessToken: "acc",
        IdToken: "id",
        RefreshToken: "ref",
        ExpiresIn: 3600,
      },
    }));
    await signIn("a@b.co", "Passw0rd");
    expect(at(sent, 0).name).toBe("InitiateAuthCommand");
    expect(at(sent, 0).input).toMatchObject({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: "a@b.co", PASSWORD: "Passw0rd" },
    });
    const session = stored();
    expect(session).toMatchObject({ accessToken: "acc", idToken: "id", refreshToken: "ref" });
    expect(session.expiresAt).toBeGreaterThan(Date.now());
    expect(isSignedIn()).toBe(true);
  });

  it("treats any challenge as unknown and stores nothing", async () => {
    install(() => ({ ChallengeName: "NEW_PASSWORD_REQUIRED", Session: "s" }));
    await expect(signIn("a@b.co", "pw")).rejects.toMatchObject({ code: "UNKNOWN" });
    expect(isSignedIn()).toBe(false);
  });

  it("maps a wrong password and an unconfirmed email", async () => {
    install(() => {
      throw sdkError("NotAuthorizedException", "Incorrect username or password.");
    });
    await expect(signIn("a@b.co", "pw")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    install(() => {
      throw sdkError("UserNotConfirmedException");
    });
    await expect(signIn("a@b.co", "pw")).rejects.toMatchObject({ code: "NOT_CONFIRMED" });
  });
});

describe("getAccessToken", () => {
  it("returns null when signed out and the stored token when far from expiry", async () => {
    expect(await getAccessToken()).toBeNull();
    storeSession();
    const sent = install(() => ({}));
    expect(await getAccessToken()).toBe("old-access");
    expect(sent).toHaveLength(0);
  });

  it("refreshes near expiry and keeps the old refresh token", async () => {
    storeSession({ expiresAt: Date.now() + REFRESH_THRESHOLD_MS - 1000 });
    const sent = install(() => ({
      AuthenticationResult: { AccessToken: "new-access", IdToken: "new-id", ExpiresIn: 3600 },
    }));
    expect(await getAccessToken()).toBe("new-access");
    expect(at(sent, 0).input).toMatchObject({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { REFRESH_TOKEN: "old-refresh" },
    });
    expect(stored()).toMatchObject({
      accessToken: "new-access",
      idToken: "new-id",
      refreshToken: "old-refresh",
    });
  });

  it("adopts a new refresh token when the reply includes one", async () => {
    storeSession({ expiresAt: Date.now() - 1 });
    install(() => ({
      AuthenticationResult: { AccessToken: "a2", RefreshToken: "r2", ExpiresIn: 3600 },
    }));
    await getAccessToken();
    expect(stored().refreshToken).toBe("r2");
  });

  it("shares one refresh between concurrent callers", async () => {
    storeSession({ expiresAt: Date.now() - 1 });
    const sent = install(async () => ({
      AuthenticationResult: { AccessToken: "shared", ExpiresIn: 3600 },
    }));
    const tokens = await Promise.all([getAccessToken(), getAccessToken(), getAccessToken()]);
    expect(tokens).toEqual(["shared", "shared", "shared"]);
    expect(sent).toHaveLength(1);
    // A later expiry starts a fresh refresh.
    storeSession({ expiresAt: Date.now() - 1 });
    await getAccessToken();
    expect(sent).toHaveLength(2);
  });

  it("clears the store and returns null when the refresh token is rejected", async () => {
    storeSession({ expiresAt: Date.now() - 1 });
    install(() => {
      throw sdkError("NotAuthorizedException", "Refresh Token has expired");
    });
    expect(await getAccessToken()).toBeNull();
    expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("keeps the session on a network failure while the token still works", async () => {
    storeSession({ expiresAt: Date.now() + REFRESH_THRESHOLD_MS - 1000 });
    install(() => {
      throw new TypeError("Failed to fetch");
    });
    expect(await getAccessToken()).toBe("old-access");
    expect(isSignedIn()).toBe(true);
  });

  it("throws a network error when the token is already dead and the network is down", async () => {
    storeSession({ expiresAt: Date.now() - 1 });
    install(() => {
      throw new TypeError("Failed to fetch");
    });
    await expect(getAccessToken()).rejects.toMatchObject({ code: "NETWORK" });
    expect(isSignedIn()).toBe(true);
  });
});

describe("sign up and recovery", () => {
  it("signs up with the email as username and attribute", async () => {
    const sent = install(() => ({ UserConfirmed: false }));
    expect(await signUp("a@b.co", "Passw0rd")).toEqual({ confirmed: false });
    expect(at(sent, 0).name).toBe("SignUpCommand");
    expect(at(sent, 0).input).toMatchObject({
      ClientId: CLIENT_ID,
      Username: "a@b.co",
      Password: "Passw0rd",
      UserAttributes: [{ Name: "email", Value: "a@b.co" }],
    });
  });

  it("reports an auto-confirmed sign-up", async () => {
    install(() => ({ UserConfirmed: true }));
    expect(await signUp("a@b.co", "Passw0rd")).toEqual({ confirmed: true });
  });

  it("confirms, resends, and runs the forgot-password flow", async () => {
    const sent = install(() => ({}));
    await confirmSignUp("a@b.co", "123456");
    await resendSignUpCode("a@b.co");
    await forgotPassword("a@b.co");
    await confirmForgotPassword("a@b.co", "654321", "NewPassw0rd");
    expect(sent.map((s) => s.name)).toEqual([
      "ConfirmSignUpCommand",
      "ResendConfirmationCodeCommand",
      "ForgotPasswordCommand",
      "ConfirmForgotPasswordCommand",
    ]);
    expect(at(sent, 0).input).toMatchObject({ ConfirmationCode: "123456", Username: "a@b.co" });
    expect(at(sent, 3).input).toMatchObject({
      ConfirmationCode: "654321",
      Password: "NewPassw0rd",
    });
  });
});

describe("signed-in account actions", () => {
  beforeEach(() => storeSession());

  it("reads the account email", async () => {
    const sent = install(() => ({
      UserAttributes: [
        { Name: "sub", Value: "x" },
        { Name: "email", Value: "a@b.co" },
        { Name: "email_verified", Value: "true" },
      ],
    }));
    expect(await getAccountEmail()).toEqual({ email: "a@b.co", emailVerified: true });
    expect(at(sent, 0).name).toBe("GetUserCommand");
    expect(at(sent, 0).input).toEqual({ AccessToken: "old-access" });
  });

  it("changes password, starts and confirms an email change", async () => {
    const sent = install(() => ({}));
    await changePassword("Old1pass", "New1pass");
    await changeEmail("new@b.co");
    await confirmEmailChange("111222");
    await resendEmailChangeCode();
    expect(sent.map((s) => s.name)).toEqual([
      "ChangePasswordCommand",
      "UpdateUserAttributesCommand",
      "VerifyUserAttributeCommand",
      "GetUserAttributeVerificationCodeCommand",
    ]);
    expect(at(sent, 0).input).toEqual({
      AccessToken: "old-access",
      PreviousPassword: "Old1pass",
      ProposedPassword: "New1pass",
    });
    expect(at(sent, 1).input).toMatchObject({
      UserAttributes: [{ Name: "email", Value: "new@b.co" }],
    });
    expect(at(sent, 2).input).toMatchObject({ AttributeName: "email", Code: "111222" });
    expect(at(sent, 3).input).toMatchObject({ AttributeName: "email" });
  });

  it("refuses with NOT_SIGNED_IN when there is no session", async () => {
    window.localStorage.clear();
    const sent = install(() => ({}));
    await expect(changePassword("a", "b")).rejects.toMatchObject({ code: "NOT_SIGNED_IN" });
    await expect(getAccountEmail()).rejects.toMatchObject({ code: "NOT_SIGNED_IN" });
    expect(sent).toHaveLength(0);
  });
});

describe("signOut", () => {
  it("revokes the refresh token and clears the store", async () => {
    storeSession();
    const sent = install(() => ({}));
    await signOut();
    expect(at(sent, 0).name).toBe("RevokeTokenCommand");
    expect(at(sent, 0).input).toEqual({ Token: "old-refresh", ClientId: CLIENT_ID });
    expect(isSignedIn()).toBe(false);
  });

  it("clears the store even if revoking fails", async () => {
    storeSession();
    install(() => {
      throw new TypeError("offline");
    });
    await expect(signOut()).resolves.toBeUndefined();
    expect(isSignedIn()).toBe(false);
  });

  it("is safe when already signed out", async () => {
    const sent = install(() => ({}));
    await signOut();
    expect(sent).toHaveLength(0);
  });
});

describe("error mapping", () => {
  const cases: [string, AuthErrorCode][] = [
    ["NotAuthorizedException", "INVALID_CREDENTIALS"],
    ["UserNotConfirmedException", "NOT_CONFIRMED"],
    ["CodeMismatchException", "CODE_MISMATCH"],
    ["ExpiredCodeException", "CODE_EXPIRED"],
    ["LimitExceededException", "TOO_MANY_ATTEMPTS"],
    ["TooManyRequestsException", "TOO_MANY_ATTEMPTS"],
    ["TooManyFailedAttemptsException", "TOO_MANY_ATTEMPTS"],
    ["UsernameExistsException", "EMAIL_TAKEN"],
    ["AliasExistsException", "EMAIL_TAKEN"],
    ["InvalidPasswordException", "WEAK_PASSWORD"],
    ["InvalidParameterException", "INVALID_INPUT"],
    ["SomethingNewException", "UNKNOWN"],
  ];

  it.each(cases)("maps %s to %s without leaking the raw message", async (name, code) => {
    install(() => {
      throw sdkError(name, "RAW SDK TEXT");
    });
    const err = await forgotPassword("a@b.co").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect((err as AuthError).code).toBe(code);
    expect((err as AuthError).message).toBe(AUTH_ERROR_COPY[code]);
    expect((err as AuthError).message).not.toContain("RAW SDK TEXT");
  });

  it("maps password attempts exceeded to too many attempts", async () => {
    install(() => {
      throw sdkError("NotAuthorizedException", "Password attempts exceeded");
    });
    await expect(signIn("a@b.co", "pw")).rejects.toMatchObject({ code: "TOO_MANY_ATTEMPTS" });
  });

  it("maps fetch failures to network", async () => {
    install(() => {
      throw new TypeError("Failed to fetch");
    });
    await expect(forgotPassword("a@b.co")).rejects.toMatchObject({ code: "NETWORK" });
  });

  it("has copy for every code that never mentions account existence", () => {
    for (const text of Object.values(AUTH_ERROR_COPY)) {
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toMatch(
        /no account|does not exist|not registered|already (has|registered)/i,
      );
    }
  });
});

describe("checkPassword", () => {
  it("checks each rule", () => {
    expect(checkPassword("")).toEqual({
      length: false,
      lowercase: false,
      number: false,
      ok: false,
    });
    expect(checkPassword("abcdefgh")).toMatchObject({
      length: true,
      lowercase: true,
      number: false,
      ok: false,
    });
    expect(checkPassword("12345678")).toMatchObject({
      length: true,
      lowercase: false,
      number: true,
      ok: false,
    });
    expect(checkPassword("abc1")).toMatchObject({ length: false, ok: false });
    expect(checkPassword("abcdefg1")).toEqual({
      length: true,
      lowercase: true,
      number: true,
      ok: true,
    });
  });
});

describe("blocked storage", () => {
  it("never throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    install(() => ({
      AuthenticationResult: { AccessToken: "a", IdToken: "i", RefreshToken: "r", ExpiresIn: 3600 },
    }));
    await expect(signIn("a@b.co", "pw")).resolves.toBeUndefined();
    expect(await getAccessToken()).toBeNull();
    expect(isSignedIn()).toBe(false);
    await expect(signOut()).resolves.toBeUndefined();
  });

  it("ignores a corrupt stored session", async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, "{not json");
    expect(isSignedIn()).toBe(false);
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: 1 }));
    expect(await getAccessToken()).toBeNull();
  });
});
