import { EMERGENCY_NUMBER } from "../config";
import { IconPhone } from "./Icons";

// Always visible on Home. A plain tel: link, so one tap dials with no confirm step.
export function EmergencyCallButton() {
  return (
    <a className="emergency-call" href={`tel:${EMERGENCY_NUMBER}`}>
      <IconPhone size={28} strokeWidth={2.2} aria-hidden="true" />
      <span className="emergency-call__text">
        <span className="emergency-call__title">Call {EMERGENCY_NUMBER}</span>
        <span className="emergency-call__sub">Police, ambulance or fire</span>
      </span>
    </a>
  );
}
