import { EMERGENCY_NUMBER } from "../config";
import { IconPhone } from "./Icons";
import { useCallConfirm } from "./CallConfirm";

// Opens a confirm-before-dial slide-up sheet (with a slide-to-confirm control)
// rather than dialing on one tap, so a mis-tap never places an emergency call.
// The compact form is a slim bar for hazard and request screens.
export function EmergencyCallButton({ compact = false }: { compact?: boolean }) {
  const { requestCall } = useCallConfirm();
  return (
    <button
      type="button"
      className={`emergency-call${compact ? " emergency-call--compact" : ""}`}
      onClick={() =>
        requestCall({
          tel: EMERGENCY_NUMBER,
          display: EMERGENCY_NUMBER,
          label: "Emergency services",
          note: "Police, ambulance or fire",
          danger: true,
        })
      }
    >
      <IconPhone size={compact ? 22 : 28} strokeWidth={2.2} aria-hidden="true" />
      <span className="emergency-call__text">
        <span className="emergency-call__title">Call {EMERGENCY_NUMBER}</span>
        {compact ? null : <span className="emergency-call__sub">Police, ambulance or fire</span>}
      </span>
    </button>
  );
}
