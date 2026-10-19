import { RotateCcw, Wrench } from "lucide-react";
import { useState } from "react";

import { useAcceptedTasks } from "../../data/AcceptedTasksContext";
import { useGamification } from "../../data/useGamification";
import { useProfile } from "../../data/ProfileContext";
import { demoControlsEnabled } from "../../lib/demoFlag";
import { AppButton, ConfirmationDialog, InfoCard, Modal } from "../ui";

/**
 * Small, unobtrusive demo-only controls. Renders nothing unless demo controls
 * are enabled (dev build, or VITE_DEMO_CONTROLS=true for the preview). NOT part
 * of the normal resident experience and NOT a security mechanism.
 *
 * Reset clears ALL demo state across Help a Neighbour and Community Challenges:
 * accepted/completed/verified tasks, challenge progress, points ledger, verified
 * volunteering task count, badges/achievements (derived), and reward redemption.
 * A confirmation step guards the reset so it is never a one-tap accident.
 */
export function DemoControls() {
  const { reset: resetGamification } = useGamification();
  const { reset: resetTasks } = useAcceptedTasks();
  const { reset: resetProfile } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  if (!demoControlsEnabled()) return null;

  function confirmReset() {
    resetGamification();
    resetTasks();
    resetProfile();
    setConfirming(false);
    setDone(true);
  }

  return (
    <section className="ui-section" aria-label="Demo controls">
      <InfoCard>
        <div className="feature-card">
          <div className="feature-card-head">
            <h3 className="feature-card-title">
              <span className="inline-icon">
                <Wrench size={18} aria-hidden="true" />
                Demo controls
              </span>
            </h3>
          </div>
          <p className="ui-helper" style={{ marginTop: 0 }}>
            Development/demo only. Resets all simulated progress so the app returns
            to a clean, consistent state for a fresh walkthrough.
          </p>
          <div className="feature-card-foot">
            <AppButton variant="danger" onClick={() => setConfirming(true)}>
              <RotateCcw size={16} aria-hidden="true" />
              Reset demo data
            </AppButton>
          </div>
        </div>
      </InfoCard>

      {/* Confirm BEFORE destroying demo state. */}
      <Modal
        open={confirming}
        title="Reset all demo data?"
        onClose={() => setConfirming(false)}
        footer={
          <>
            <AppButton variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </AppButton>
            <AppButton variant="danger" onClick={confirmReset}>
              Reset everything
            </AppButton>
          </>
        }
      >
        <p style={{ margin: 0 }}>
          This clears accepted tasks, completed and verified tasks, challenge
          progress, points, achievements, reward redemption and profile
          preferences. This cannot be undone.
        </p>
      </Modal>

      {/* Success acknowledgement AFTER reset. */}
      <ConfirmationDialog
        open={done}
        title="Demo data reset"
        message="All simulated tasks, challenge progress, points, badges and rewards have been cleared."
        onClose={() => setDone(false)}
      />
    </section>
  );
}
