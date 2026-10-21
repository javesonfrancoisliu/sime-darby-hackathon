import { EMERGENCY_NUMBER } from "../config";
import { useTownship } from "../hooks/useTownship";
import { useCallConfirm } from "./CallConfirm";

// Township security and the emergency number. Each call still asks for confirmation first.
export function QuickDial() {
  const securityLine = useTownship().data?.securityLine;
  const { requestCall } = useCallConfirm();

  return (
    <div className="apple-emergency-grid">
      {securityLine ? (
        <button
          type="button"
          className="apple-emergency-btn"
          onClick={() =>
            requestCall({
              tel: securityLine.tel,
              display: securityLine.display,
              label: "Township security",
              note: "24/7 township hotline",
            })
          }
        >
          <span className="apple-emergency-btn__label">Township security</span>
          <span className="apple-emergency-btn__number">{securityLine.display}</span>
        </button>
      ) : null}
      <button
        type="button"
        className="apple-emergency-btn apple-emergency-btn--danger"
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
        <span className="apple-emergency-btn__label">Call {EMERGENCY_NUMBER}</span>
        <span className="apple-emergency-btn__number">Police, ambulance or fire</span>
      </button>
    </div>
  );
}
