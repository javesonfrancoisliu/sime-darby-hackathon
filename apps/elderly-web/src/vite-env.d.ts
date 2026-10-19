/// <reference types="vite/client" />

interface ImportMetaEnv {
  // "false" removes the demo sign-in picker from the build.
  readonly VITE_DEMO_SIGN_IN?: string;
  readonly VITE_COGNITO_REGION?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
}
