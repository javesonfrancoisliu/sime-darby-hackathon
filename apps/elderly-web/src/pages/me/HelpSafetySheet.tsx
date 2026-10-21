import { useNavigate } from "react-router-dom";
import { HubRow } from "../../ui/HubRow";
import { IconShield } from "../../ui/Icons";
import { QuickDial } from "../../ui/QuickDial";
import { Sheet } from "../../ui/Sheet";

interface HelpSafetySheetProps {
  open: boolean;
  onClose: () => void;
}

// Township security and the emergency number, each behind the call confirmation, plus the way to
// the live conditions page.
export function HelpSafetySheet({ open, onClose }: HelpSafetySheetProps) {
  const navigate = useNavigate();

  function openConditions() {
    onClose();
    // Replaces the sheet's history entry so Back from the Safety page lands on Profile.
    navigate("/safety", { replace: true });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Help and safety"
      subtitle="You will be asked to confirm before a call is made"
    >
      <div className="apple-sheet-content">
        <div className="ui-stack">
          <QuickDial />
          <div className="apple-inset-group">
            <HubRow
              icon={<IconShield size={20} strokeWidth={1.8} />}
              title="Health and safety conditions"
              summary="Haze, heat and township facilities"
              onClick={openConditions}
            />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
