import { EMERGENCY_NUMBER } from "../config";
import { IconPhone } from "./Icons";

// A plain tel: link, so one tap dials with no confirm step. The compact form is a slim bar for hazard and request screens.
export function EmergencyCallButton({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`emergency-call${compact ? " emergency-call--compact" : ""}`}
      href={`tel:${EMERGENCY_NUMBER}`}
    >
      <IconPhone size={compact ? 22 : 28} strokeWidth={2.2} aria-hidden="true" />
      <span className="emergency-call__text">
        <span className="emergency-call__title">Call {EMERGENCY_NUMBER}</span>
        {compact ? null : <span className="emergency-call__sub">Police, ambulance or fire</span>}
      </span>
    </a>
  );
}
