import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@sdh/api-client";
import { tokenModeEnabled } from "../../config";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { beginPageLeave, endPageLeave } from "../../ui/pageLeave";
import { IconUserRound, IconUsers } from "../../ui/Icons";
import { Sheet } from "../../ui/Sheet";

interface AccountSheetProps {
  open: boolean;
  onClose: () => void;
}

// Account: settings and sign out with a Cognito sign-in, or Switch person on the demo picker.
export function AccountSheet({ open, onClose }: AccountSheetProps) {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const token = tokenModeEnabled();

  function switchPerson() {
    navigate("/", { replace: true });
    signOut();
  }

  async function signOutOfAccount() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFailed(false);
    // Mark the page as leaving first, so the session guard and the dialogs closing do not start
    // a second navigation or a history move that would cancel this one.
    beginPageLeave();
    try {
      await signOut();
      window.location.assign("/");
    } catch {
      // Still on this page: let the guard and the dialogs behave normally again.
      endPageLeave();
      setSigningOut(false);
      setSignOutFailed(true);
    }
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Account" subtitle="Who is using this phone">
        <div className="apple-sheet-content">
          <div className="ui-stack">
            {token ? (
              <>
                <a href="/account" className="ui-button ui-button--secondary">
                  <IconUserRound className="icon-gap" size={18} strokeWidth={2} />
                  <span>Account settings</span>
                </a>
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  onClick={() => setConfirming(true)}
                >
                  <span>Sign out</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="ui-button ui-button--secondary"
                onClick={switchPerson}
              >
                <IconUsers className="icon-gap" size={18} strokeWidth={2} />
                <span>Switch person</span>
              </button>
            )}
          </div>
        </div>
      </Sheet>
      {confirming ? (
        <ConfirmDialog
          title="Sign out?"
          confirmLabel="Yes, sign out"
          cancelLabel="Not yet"
          busy={signingOut}
          error={signOutFailed ? "We could not sign you out. Please try again." : undefined}
          onConfirm={() => void signOutOfAccount()}
          onCancel={() => {
            setConfirming(false);
            setSignOutFailed(false);
          }}
        >
          You will need to sign in again to use Township Connect.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
