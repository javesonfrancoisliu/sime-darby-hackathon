import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@sdh/api-client";
import { tokenModeEnabled } from "../../config";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { topEntryIsOpenDialog } from "../../ui/dialogLayer";
import { beginPageLeave } from "../../ui/pageLeave";
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
  const token = tokenModeEnabled();

  // Removes the armed popstate listener, if any, so it cannot fire on an unrelated Back later.
  const disarm = useRef<(() => void) | null>(null);
  useEffect(() => () => disarm.current?.(), []);

  function switchPerson() {
    const finish = () => {
      navigate("/", { replace: true });
      void signOut();
    };
    // Without the sheet's own entry on top there is nothing to step off: Profile is the current
    // entry, so replacing it with the picker is already right.
    if (!topEntryIsOpenDialog()) {
      finish();
      return;
    }
    // Step off the Account entry first, then swap the Profile entry beneath it for the picker, so
    // Back from the picker leaves the app instead of returning to Profile. The sheet's own
    // popstate listener runs first and closes it without a second step back.
    const onPop = () => {
      disarm.current = null;
      finish();
    };
    window.addEventListener("popstate", onPop, { once: true });
    disarm.current = () => window.removeEventListener("popstate", onPop);
    window.history.back();
  }

  async function signOutOfAccount() {
    if (signingOut) return;
    setSigningOut(true);
    // Mark the page as leaving first, so the session guard and the dialogs closing do not start
    // a second navigation or a history move that would cancel this one.
    beginPageLeave();
    // The session ends locally even when the server call fails, so signOut does not reject.
    await signOut();
    window.location.assign("/");
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
          busyLabel="Signing out"
          onConfirm={() => void signOutOfAccount()}
          onCancel={() => {
            setConfirming(false);
          }}
        >
          You will need to sign in again to use Township Connect.
        </ConfirmDialog>
      ) : null}
    </>
  );
}
