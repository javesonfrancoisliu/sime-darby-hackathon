// Cognito settings, set once at app start from the Vite env.

export type AuthConfig = {
  region: string;
  userPoolId: string;
  clientId: string;
};

let current: AuthConfig | null = null;

export function configureAuth(config: AuthConfig | undefined): void {
  current = config ?? null;
}

export function authConfigFromEnv(env: Record<string, string | undefined>): AuthConfig | undefined {
  const region = env.VITE_COGNITO_REGION;
  const userPoolId = env.VITE_COGNITO_USER_POOL_ID;
  const clientId = env.VITE_COGNITO_CLIENT_ID;
  if (!region || !userPoolId || !clientId) return undefined;
  return { region, userPoolId, clientId };
}

export function getAuthConfig(): AuthConfig | null {
  return current;
}

export function isAuthConfigured(): boolean {
  return current !== null;
}
