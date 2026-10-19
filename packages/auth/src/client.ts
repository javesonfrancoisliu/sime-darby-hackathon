// One lazily created Cognito client. Sign-up, sign-in and password calls are public
// operations, so no AWS credentials are involved.

import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

import { getAuthConfig, type AuthConfig } from "./config";
import { AuthError, toAuthError } from "./errors";

// The SDK's command and result types are large unions; callers only need this loose shape.
export type CognitoCommand = object;
export type CognitoSend = (command: CognitoCommand) => Promise<unknown>;

let client: CognitoIdentityProviderClient | null = null;
let clientRegion: string | null = null;
let sendOverride: CognitoSend | null = null;

export function setCognitoSendForTests(send: CognitoSend | null): void {
  sendOverride = send;
}

export function requireConfig(): AuthConfig {
  const config = getAuthConfig();
  if (!config) throw new AuthError("UNKNOWN");
  return config;
}

export async function sendCommand<T>(command: CognitoCommand): Promise<T> {
  try {
    if (sendOverride) return (await sendOverride(command)) as T;
    const { region } = requireConfig();
    if (!client || clientRegion !== region) {
      client = new CognitoIdentityProviderClient({ region });
      clientRegion = region;
    }
    const send = client.send.bind(client) as CognitoSend;
    return (await send(command)) as T;
  } catch (err) {
    throw toAuthError(err);
  }
}
