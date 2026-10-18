import { CognitoJwtVerifier } from "aws-jwt-verify";
import { config } from "./config";
import { HttpError } from "./http";

export type TokenVerifier = (token: string) => Promise<{ sub: string }>;

interface CachedVerifier {
  userPoolId: string;
  clientId: string;
  verify: TokenVerifier;
}

let cached: CachedVerifier | undefined;
let override: TokenVerifier | null = null;

// Tests inject a fake so no real Cognito pool or network is needed.
export function setTokenVerifierForTests(verifier: TokenVerifier | null): void {
  override = verifier;
}

function cognitoVerifier(): TokenVerifier {
  const userPoolId = config.cognitoUserPoolId;
  const clientId = config.cognitoClientId;
  if (!userPoolId || !clientId) throw new Error("Cognito is not configured");
  if (cached?.userPoolId !== userPoolId || cached.clientId !== clientId) {
    const verifier = CognitoJwtVerifier.create({ userPoolId, tokenUse: "access", clientId });
    cached = { userPoolId, clientId, verify: (token) => verifier.verify(token) };
  }
  return cached.verify;
}

// Returns only the sub; every failure gets the same message so nothing about the token leaks.
export async function verifyAccessToken(token: string): Promise<{ sub: string }> {
  try {
    const payload = await (override ?? cognitoVerifier())(token);
    if (!payload.sub) throw new Error("missing sub");
    return { sub: payload.sub };
  } catch {
    throw new HttpError("UNAUTHENTICATED", "Please sign in again");
  }
}
