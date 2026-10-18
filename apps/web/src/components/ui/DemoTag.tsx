import { FlaskConical } from "lucide-react";

// "Demo data" indicator required by the integration contract: simulated feeds
// must never be presented as live observations.
export function DemoTag() {
  return (
    <span className="ui-demo-tag">
      <FlaskConical size={12} aria-hidden="true" />
      Demo data
    </span>
  );
}
