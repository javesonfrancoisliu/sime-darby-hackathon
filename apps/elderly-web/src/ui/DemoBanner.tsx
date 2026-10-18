import { isMockMode } from "../config";

// Visible strip shown for the whole app while demo data is switched on.
export function DemoBanner() {
  if (!isMockMode()) return null;
  return (
    <div className="demo-banner" role="status">
      Demo data. Nothing here is real.
    </div>
  );
}
