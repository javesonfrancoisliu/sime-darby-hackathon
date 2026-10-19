import { DemoTag } from "../ui";
import { formatRelative } from "../../lib/format";

export type CardMetaProps = {
  updatedAt: string;
  sourceLabel: string;
  isDemoData: boolean;
};

// Consistent card footer metadata: last-updated + source, plus the Demo data tag
// for simulated feeds. Used by every community card so labelling is uniform.
export function CardMeta({ updatedAt, sourceLabel, isDemoData }: CardMetaProps) {
  return (
    <div className="ui-meta-row">
      <span>Updated {formatRelative(updatedAt)}</span>
      <span className="ui-meta-dot" aria-hidden="true">
        •
      </span>
      <span>{sourceLabel}</span>
      {isDemoData && <DemoTag />}
    </div>
  );
}
