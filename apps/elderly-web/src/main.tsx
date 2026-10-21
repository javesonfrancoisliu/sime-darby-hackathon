import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AppErrorBoundary, setAccessTokenProvider } from "@sdh/api-client";
import { startAuthFromEnv } from "@sdh/auth";

import { App } from "./App";
import "@sdh/design-tokens/tokens.css";
import "./theme/app.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

// With Cognito settings the app signs in for real; without them it keeps the local demo.
const auth = startAuthFromEnv(import.meta.env);
if (auth) setAccessTokenProvider(auth.getAccessToken);

// Vite's base ends in a slash; the router wants it without.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary homeHref="/elder/">
      <BrowserRouter basename={basename}>
        <App auth={auth} />
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
);
