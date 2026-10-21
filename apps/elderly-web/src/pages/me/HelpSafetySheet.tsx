import { QuickDial } from "../../ui/QuickDial";
import { Sheet } from "../../ui/Sheet";

interface HelpSafetySheetProps {
  open: boolean;
  onClose: () => void;
}

// Township security and the emergency number, each behind the call confirmation.
export function HelpSafetySheet({ open, onClose }: HelpSafetySheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Help and safety"
      subtitle="You will be asked to confirm before a call is made"
    >
      <div className="apple-sheet-content">
        <QuickDial />
      </div>
    </Sheet>
  );
}
