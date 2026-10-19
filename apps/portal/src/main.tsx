import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { SessionProvider, setAccessTokenProvider } from "@sdh/api-client";
import { startAuthFromEnv } from "@sdh/auth";

import { App } from "./App";
import { Unconfigured } from "./Unconfigured";
import "@sdh/design-tokens/tokens.css";
import "./styles/portal.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

const auth = startAuthFromEnv(import.meta.env);
if (auth) setAccessTokenProvider(auth.getAccessToken);

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      {auth ? (
        <SessionProvider auth={auth}>
          <App />
        </SessionProvider>
      ) : (
        <Unconfigured />
      )}
    </BrowserRouter>
  </StrictMode>,
);
