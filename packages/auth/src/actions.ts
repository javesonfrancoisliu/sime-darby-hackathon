// Account actions against the Cognito user pool. Nothing here logs or returns raw tokens
// except getAccessToken, which hands the current access token to the API client.

import {
  ChangePasswordCommand,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  GetUserAttributeVerificationCodeCommand,
  GetUserCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  RevokeTokenCommand,
  SignUpCommand,
  UpdateUserAttributesCommand,
  VerifyUserAttributeCommand,
  type AuthenticationResultType,
} from "@aws-sdk/client-cognito-identity-provider";

import { sendCommand, requireConfig } from "./client";
import { getAuthConfig } from "./config";
import { AuthError } from "./errors";
import { clearSession, readSession, writeSession, type StoredSession } from "./store";

// Refresh when the access token has less than this left.
export const REFRESH_THRESHOLD_MS = 2 * 60 * 1000;
const MS_PER_SECOND = 1000;
// Cognito's default access token lifetime, used only if a reply omits ExpiresIn.
const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60;
const EMAIL_ATTRIBUTE = "email";
const EMAIL_VERIFIED_ATTRIBUTE = "email_verified";

type InitiateAuthReply = {
  AuthenticationResult?: AuthenticationResultType;
  ChallengeName?: string;
};

function expiresAtFrom(result: AuthenticationResultType): number {
  return Date.now() + (result.ExpiresIn ?? DEFAULT_EXPIRES_IN_SECONDS) * MS_PER_SECOND;
}

export async function signUp(email: string, password: string): Promise<{ confirmed: boolean }> {
  const reply = await sendCommand<{ UserConfirmed?: boolean }>(
    new SignUpCommand({
      ClientId: requireConfig().clientId,
      Username: email,
      Password: password,
      UserAttributes: [{ Name: EMAIL_ATTRIBUTE, Value: email }],
    }),
  );
  return { confirmed: reply.UserConfirmed === true };
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  await sendCommand(
    new ConfirmSignUpCommand({
      ClientId: requireConfig().clientId,
      Username: email,
      ConfirmationCode: code,
    }),
  );
}

export async function resendSignUpCode(email: string): Promise<void> {
  await sendCommand(
    new ResendConfirmationCodeCommand({ ClientId: requireConfig().clientId, Username: email }),
  );
}

export async function signIn(email: string, password: string): Promise<void> {
  const reply = await sendCommand<InitiateAuthReply>(
    new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: requireConfig().clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );
  const result = reply.AuthenticationResult;
  // Challenges (MFA, forced password change) are not supported by this pool setup.
  if (reply.ChallengeName || !result?.AccessToken || !result.IdToken || !result.RefreshToken) {
    throw new AuthError("UNKNOWN");
  }
  writeSession({
    accessToken: result.AccessToken,
    idToken: result.IdToken,
    refreshToken: result.RefreshToken,
    expiresAt: expiresAtFrom(result),
  });
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshSession(session: StoredSession): Promise<string | null> {
  try {
    const reply = await sendCommand<InitiateAuthReply>(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: requireConfig().clientId,
        AuthParameters: { REFRESH_TOKEN: session.refreshToken },
      }),
    );
    const result = reply.AuthenticationResult;
    if (!result?.AccessToken) throw new AuthError("UNKNOWN");
    writeSession({
      accessToken: result.AccessToken,
      idToken: result.IdToken ?? session.idToken,
      // Cognito usually omits the refresh token here; keep the one we have.
      refreshToken: result.RefreshToken ?? session.refreshToken,
      expiresAt: expiresAtFrom(result),
    });
    return result.AccessToken;
  } catch (err) {
    if (err instanceof AuthError && err.code === "INVALID_CREDENTIALS") {
      clearSession();
      return null;
    }
    // A passing failure (network, throttling) must not sign the person out.
    if (session.expiresAt > Date.now()) return session.accessToken;
    throw err;
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!getAuthConfig()) return null;
  const session = readSession();
  if (!session) return null;
  if (session.expiresAt - Date.now() > REFRESH_THRESHOLD_MS) return session.accessToken;
  refreshInFlight ??= refreshSession(session).finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

export function isSignedIn(): boolean {
  return readSession() !== null;
}

async function requireToken(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new AuthError("NOT_SIGNED_IN");
  return token;
}

export async function getAccountEmail(): Promise<{ email: string; emailVerified: boolean }> {
  const reply = await sendCommand<{ UserAttributes?: { Name?: string; Value?: string }[] }>(
    new GetUserCommand({ AccessToken: await requireToken() }),
  );
  const attributes = reply.UserAttributes ?? [];
  const valueOf = (name: string) => attributes.find((a) => a.Name === name)?.Value;
  return {
    email: valueOf(EMAIL_ATTRIBUTE) ?? "",
    emailVerified: valueOf(EMAIL_VERIFIED_ATTRIBUTE) === "true",
  };
}

export async function forgotPassword(email: string): Promise<void> {
  await sendCommand(
    new ForgotPasswordCommand({ ClientId: requireConfig().clientId, Username: email }),
  );
}

export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<void> {
  await sendCommand(
    new ConfirmForgotPasswordCommand({
      ClientId: requireConfig().clientId,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    }),
  );
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await sendCommand(
    new ChangePasswordCommand({
      AccessToken: await requireToken(),
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
    }),
  );
}

// Sends a code to the new address; the old email keeps working until the code is confirmed.
export async function changeEmail(newEmail: string): Promise<void> {
  await sendCommand(
    new UpdateUserAttributesCommand({
      AccessToken: await requireToken(),
      UserAttributes: [{ Name: EMAIL_ATTRIBUTE, Value: newEmail }],
    }),
  );
}

export async function confirmEmailChange(code: string): Promise<void> {
  await sendCommand(
    new VerifyUserAttributeCommand({
      AccessToken: await requireToken(),
      AttributeName: EMAIL_ATTRIBUTE,
      Code: code,
    }),
  );
}

export async function resendEmailChangeCode(): Promise<void> {
  await sendCommand(
    new GetUserAttributeVerificationCodeCommand({
      AccessToken: await requireToken(),
      AttributeName: EMAIL_ATTRIBUTE,
    }),
  );
}

export async function signOut(): Promise<void> {
  const session = readSession();
  try {
    if (session && getAuthConfig()) {
      await sendCommand(
        new RevokeTokenCommand({
          Token: session.refreshToken,
          ClientId: requireConfig().clientId,
        }),
      );
    }
  } catch {
    // Best effort: the local sign-out below must happen even if the server call fails.
  } finally {
    clearSession();
  }
}
