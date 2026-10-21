import type { RefObject } from "react";
import { LogOut, UserRound } from "lucide-react";

import { useSession } from "@sdh/api-client";

import { demoSignInEnabled } from "../../lib/demoFlag";
import { tokenModeEnabled } from "../../lib/authMode";
import { useConfirm } from "../../lib/useConfirm";
import { AppButton, ConfirmActionDialog, Sheet } from "../ui";
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
  const confirm = useConfirm();
  const tokenMode = tokenModeEnabled();

  async function signOutOfAccount() {
    await signOut();
    window.location.assign("/");
  }

  function askSignOut() {
    confirm.ask({
      title: "Sign out?",
      message: "Are you sure you want to sign out?",
      confirmLabel: "Yes, sign out",
      confirmVariant: "danger",
      onConfirm: signOutOfAccount,
    });
  }

  return (
    <>
      <Sheet open onClose={onClose} openerRef={openerRef} title="Account">
        <div className="sheet-stack">
          {tokenMode ? (
            <>
              <a href="/account" className="ui-button ui-button--secondary">
                <UserRound size={16} aria-hidden="true" />
                Account settings
              </a>
              <AppButton variant="secondary" onClick={askSignOut}>
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
      </Sheet>
      <ConfirmActionDialog
        open={confirm.open}
        title={confirm.request?.title ?? ""}
        message={confirm.request?.message ?? ""}
        confirmLabel={confirm.request?.confirmLabel}
        cancelLabel={confirm.request?.cancelLabel}
        confirmVariant={confirm.request?.confirmVariant}
        busy={confirm.busy}
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    </>
  );
}
