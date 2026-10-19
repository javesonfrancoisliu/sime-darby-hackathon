import { formatRelative } from "../../lib/format";

export type CardMetaProps = {
  updatedAt: string;
  // Who published it, when known.
  source?: string;
};

// Consistent card footer metadata: last updated, plus who published it.
export function CardMeta({ updatedAt, source }: CardMetaProps) {
  return (
    <div className="ui-meta-row">
      <span>Updated {formatRelative(updatedAt)}</span>
      {source && (
        <>
          <span className="ui-meta-dot" aria-hidden="true">
            •
          </span>
          <span>{source}</span>
        </>
      )}
    </div>
  );
}
