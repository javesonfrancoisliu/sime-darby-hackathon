import { useEffect, type ReactNode } from "react";
import { useSession } from "@sdh/api-client";
import { logApiError } from "../api/errors";
import { demoSignInEnabled, tokenModeEnabled } from "../config";
import { AppShell } from "../ui/AppShell";
import { WhoIsUsingPage } from "../pages/WhoIsUsingPage";
import { Banner } from "../ui/Banner";
import { Button } from "../ui/Button";
import { EmergencyCallButton } from "../ui/EmergencyCallButton";
import { endPageLeave, pageIsLeaving } from "../ui/pageLeave";
import { Spinner } from "../ui/Spinner";
import { useSessionRedirect } from "./useSessionRedirect";

// Shows the app only once someone is chosen; otherwise asks who is using the phone.
export function SessionGate({ children }: { children: ReactNode }) {
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

  // A signed-out page restored from the back-forward cache is stale: load it fresh.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (!event.persisted || !pageIsLeaving()) return;
      endPageLeave();
      window.location.reload();
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (status === "signed_in" && !redirecting) return <>{children}</>;
  if (status === "loading" || redirecting) {
    return (
      <AppShell hideTabs>
        <Spinner label="Getting things ready" />
      </AppShell>
    );
  }
  if (error) logApiError(error);
  return <LoadFailed />;
}

// A stored person who is not a resident (a volunteer or coordinator) is asked to choose again.
const NOT_A_RESIDENT_TEXT = "This app is for residents. Please choose a resident below.";

function DemoSessionGate({ children }: { children: ReactNode }) {
  const { status, error, user } = useSession();

  if (status === "signed_in" && user?.role === "elder") return <>{children}</>;
  if (status === "signed_out" || status === "signed_in")
    return (
      <AppShell hideTabs>
        {demoSignInEnabled() ? (
          <WhoIsUsingPage notice={status === "signed_in" ? NOT_A_RESIDENT_TEXT : undefined} />
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
  return <LoadFailed />;
}

// Same page frame as the rest of the app, with a retry that asks the session again.
function LoadFailed() {
  const { refresh } = useSession();
  return (
    <AppShell hideTabs>
      <div className="apple-subpage">
        <h1 className="ui-page-title">We could not load your details</h1>
        <p className="ui-page-subtitle app-page-lead" role="alert">
          We could not reach the service right now. Please try again in a moment.
        </p>
        <Button block onClick={refresh}>
          Try again
        </Button>
        <div className="request-detail__call">
          <EmergencyCallButton compact />
        </div>
      </div>
    </AppShell>
  );
}
