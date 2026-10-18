/// <reference types="vite/client" />

interface ImportMetaEnv {
  // "true" serves labelled demo data instead of calling the API.
  readonly VITE_USE_MOCK?: string;
}
