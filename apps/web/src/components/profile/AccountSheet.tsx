import { useEffect, useRef, useState, type RefObject } from "react";
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
  const [failed, setFailed] = useState(false);
  const tokenMode = tokenModeEnabled();
  const listRef = useRef<HTMLDivElement>(null);

  // Leaving the confirm step unmounts the focused button, so put focus back on Sign out.
  const wasConfirm = useRef(false);
  useEffect(() => {
    const isConfirm = step === "confirm";
    if (wasConfirm.current && !isConfirm) {
      listRef.current?.querySelector<HTMLElement>("[data-sign-out]")?.focus();
    }
    wasConfirm.current = isConfirm;
  }, [step]);

  // Resolves true once the page is on its way out, false when the user is still signed in.
  async function signOutOfAccount(): Promise<boolean> {
    // Mark the page as leaving first, so the session guard and the dialogs closing do not start
    // a second navigation or a history move that would cancel this one.
    beginPageLeave();
    try {
      await signOut();
    } catch {
      // Still signed in on this page: let the session guard and the dialogs behave normally again.
      endPageLeave();
      return false;
    }
    try {
      window.location.assign("/");
    } catch {
      // Signed out but the navigation failed: the guard would stay on its skeleton, so reload to
      // land on the sign-in page.
      endPageLeave();
      window.location.reload();
    }
    return true;
  }

  async function confirmSignOut() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    // On success the page is leaving, so the confirm view stays locked until it unloads.
    if (!(await signOutOfAccount())) {
      setBusy(false);
      setFailed(true);
    }
  }

  // Done, Escape, Back, a scrim tap and a drag step back to the list first; none leaves mid sign-out.
  function guardClose() {
    if (step !== "confirm") return false;
    if (!busy) {
      setStep("list");
      setFailed(false);
    }
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
      doneLabel={confirming ? "Back" : "Done"}
    >
      <p role="status" className="ui-visually-hidden">
        {confirming ? "Are you sure you want to sign out?" : ""}
      </p>
      {confirming ? (
        <div className="ui-confirm">
          <span className="ui-confirm-icon ui-confirm-icon--ask" aria-hidden="true">
            <HelpCircle size={56} />
          </span>
          <p className="ui-confirm-message">Are you sure you want to sign out?</p>
          {failed ? (
            <p className="ui-confirm-message" role="alert">
              Could not sign you out. Please try again.
            </p>
          ) : null}
          <div className="sheet-stack">
            <AppButton variant="danger" onClick={() => void confirmSignOut()} loading={busy}>
              Yes, sign out
            </AppButton>
            <AppButton
              variant="secondary"
              onClick={() => {
                setStep("list");
                setFailed(false);
              }}
              disabled={busy}
              autoFocus
            >
              Not yet
            </AppButton>
          </div>
        </div>
      ) : (
        <div className="sheet-stack" ref={listRef}>
          {tokenMode ? (
            <>
              <a href="/account" className="ui-button ui-button--secondary">
                <UserRound size={16} aria-hidden="true" />
                Account settings
              </a>
              <AppButton variant="secondary" data-sign-out="" onClick={() => setStep("confirm")}>
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
