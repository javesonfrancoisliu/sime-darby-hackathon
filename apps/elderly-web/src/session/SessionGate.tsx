import type { ReactNode } from "react";
import { useSession } from "@sdh/api-client";
import { logApiError } from "../api/errors";
import { demoSignInEnabled, isMockMode } from "../config";
import { AppShell } from "../ui/AppShell";
import { WhoIsUsingPage } from "../pages/WhoIsUsingPage";
import { Banner } from "../ui/Banner";
import { Spinner } from "../ui/Spinner";

// Shows the app only once someone is chosen; otherwise asks who is using the phone.
export function SessionGate({ children }: { children: ReactNode }) {
  const { status, error } = useSession();

  if (isMockMode() || status === "signed_in") return <>{children}</>;
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
