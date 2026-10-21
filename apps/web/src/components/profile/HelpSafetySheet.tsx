import type { RefObject } from "react";
import { HelpCircle, Phone, Siren } from "lucide-react";

import { useTownship } from "../../data/useTownship";
import { Sheet } from "../ui";

// Township security and the emergency number, each one tap away.
export function HelpSafetySheet({
  onClose,
  openerRef,
}: {
  onClose: () => void;
  openerRef: RefObject<HTMLElement | null>;
}) {
  const { township } = useTownship();
  const emergency = township?.emergencyNumber ?? "999";
  return (
    <Sheet open onClose={onClose} openerRef={openerRef} title="Help and safety">
      <div className="sheet-stack">
        <p className="ui-meta-row ui-flush">
          <span className="inline-icon">
            <HelpCircle size={16} className="icon-dim" aria-hidden="true" />
            {township
              ? "Need help? Call the township security line, or 999 in an emergency."
              : "Need help? Contact your township office, or call 999 in an emergency."}
          </span>
        </p>
        {township && (
          <a className="ui-button ui-button--secondary" href={`tel:${township.securityLine.tel}`}>
            <Phone size={16} aria-hidden="true" />
            Township security {township.securityLine.display}
          </a>
        )}
        <a className="ui-button ui-button--danger" href={`tel:${emergency}`}>
          <Siren size={16} aria-hidden="true" />
          Emergency {emergency}
        </a>
      </div>
    </Sheet>
  );
}
