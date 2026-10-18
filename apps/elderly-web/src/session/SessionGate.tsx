import type { ReactNode } from "react";
import { useSession } from "@sdh/api-client";
import { logApiError } from "../api/errors";
import { demoSignInEnabled, isMockMode, tokenModeEnabled } from "../config";
import { AppShell } from "../ui/AppShell";
import { WhoIsUsingPage } from "../pages/WhoIsUsingPage";
import { Banner } from "../ui/Banner";
import { Spinner } from "../ui/Spinner";
import { useSessionRedirect } from "./useSessionRedirect";

// Shows the app only once someone is chosen; otherwise asks who is using the phone.
export function SessionGate({ children }: { children: ReactNode }) {
  if (isMockMode()) return <>{children}</>;
  return tokenModeEnabled() ? (
    <TokenSessionGate>{children}</TokenSessionGate>
  ) : (
    <DemoSessionGate>{children}</DemoSessionGate>
  );
}

// Real sign-in: anyone who is not a signed-in resident is sent to the right page.
function TokenSessionGate({ children }: { children: ReactNode }) {
  const { status, error } = useSession();
  const redirecting = useSessionRedirect();

  if (status === "signed_in" && !redirecting) return <>{children}</>;
  if (status === "loading" || redirecting) {
    return (
      <AppShell hideTabs>
        <Spinner label="Getting things ready" />
      </AppShell>
    );
  }
  if (error) logApiError(error);
  return (
    <AppShell hideTabs>
      <Banner
        message="We could not load your details. Please check the internet and try again."
        onRetry={() => window.location.reload()}
      />
    </AppShell>
  );
}

function DemoSessionGate({ children }: { children: ReactNode }) {
  const { status, error } = useSession();

  if (status === "signed_in") return <>{children}</>;
  if (status === "signed_out")
    return (
      <AppShell hideTabs>
        {demoSignInEnabled() ? (
          <WhoIsUsingPage />
        ) : (
          <Banner message="Sign-in is not available in this version of the app." />
        )}
      </AppShell>
    );
  if (status === "loading") {
    return (
      <AppShell hideTabs>
        <Spinner label="Getting things ready" />
      </AppShell>
    );
  }
  if (error) logApiError(error);
  return (
    <AppShell hideTabs>
      <Banner
        message="We could not load your details. Please check the internet and try again."
        onRetry={() => window.location.reload()}
      />
    </AppShell>
  );
}
