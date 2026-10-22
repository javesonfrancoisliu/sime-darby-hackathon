import { useState, type RefObject } from "react";
import { HelpCircle, LogOut, UserRound } from "lucide-react";

import { useSession } from "@sdh/api-client";

import { demoSignInEnabled } from "../../lib/demoFlag";
import { tokenModeEnabled } from "../../lib/authMode";
import { beginPageLeave, endPageLeave } from "../../lib/pageLeave";
import { AppButton, Sheet } from "../ui";
import { DemoSignInCard } from "./DemoSignInCard";

// Account: account settings and sign out with real sign-in, the local sign-in card in a demo build.
export function AccountSheet({
  onClose,
  openerRef,
}: {
  onClose: () => void;
  openerRef: RefObject<HTMLElement | null>;
}) {
  const { user, signOut } = useSession();
  const [step, setStep] = useState<"list" | "confirm">("list");
  const [busy, setBusy] = useState(false);
  const tokenMode = tokenModeEnabled();

  async function signOutOfAccount() {
    // Mark the page as leaving first, so the session guard and the dialogs closing do not start
    // a second navigation or a history move that would cancel this one.
    beginPageLeave();
    try {
      await signOut();
    } catch {
      // Still signed in on this page: let the session guard and the dialogs behave normally again.
      endPageLeave();
      return;
    }
    try {
      window.location.assign("/");
    } catch {
      // Signed out but the navigation failed: the guard would stay on its skeleton, so reload to
      // land on the sign-in page.
      endPageLeave();
      window.location.reload();
    }
  }

  async function confirmSignOut() {
    if (busy) return;
    setBusy(true);
    try {
      await signOutOfAccount();
    } finally {
      setBusy(false);
      setStep("list");
    }
  }

  // Done, Escape, Back, a scrim tap and a drag step back to the list first; none leaves mid sign-out.
  function guardClose() {
    if (step !== "confirm") return false;
    if (!busy) setStep("list");
    return true;
  }

  const confirming = step === "confirm";

  return (
    <Sheet
      open
      onClose={onClose}
      openerRef={openerRef}
      title={confirming ? "Sign out?" : "Account"}
      guardClose={guardClose}
    >
      {confirming ? (
        <div className="ui-confirm">
          <span className="ui-confirm-icon ui-confirm-icon--ask" aria-hidden="true">
            <HelpCircle size={56} />
          </span>
          <p className="ui-confirm-message" role="status">
            Are you sure you want to sign out?
          </p>
          <div className="sheet-stack">
            <AppButton variant="danger" onClick={() => void confirmSignOut()} loading={busy}>
              Yes, sign out
            </AppButton>
            <AppButton
              variant="secondary"
              onClick={() => setStep("list")}
              disabled={busy}
              autoFocus
            >
              Not yet
            </AppButton>
          </div>
        </div>
      ) : (
        <div className="sheet-stack">
          {tokenMode ? (
            <>
              <a href="/account" className="ui-button ui-button--secondary">
                <UserRound size={16} aria-hidden="true" />
                Account settings
              </a>
              <AppButton variant="secondary" onClick={() => setStep("confirm")}>
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </AppButton>
            </>
          ) : demoSignInEnabled() ? (
            <DemoSignInCard />
          ) : (
            <p className="ui-flush">{user ? `Signed in as ${user.name}.` : "Signed in."}</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
