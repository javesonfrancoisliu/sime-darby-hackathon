import { CloudOff, Trophy } from "lucide-react";
import { useId } from "react";

import type { LeaderboardEntry } from "@sdh/contracts";

import { formatPts } from "../../lib/format";
import { EmptyState, InfoCard, LoadingState } from "../ui";

export type LeaderboardProps = {
  entries: LeaderboardEntry[];
  // The caller's own row when opted in, even if it falls outside the top entries.
  me?: LeaderboardEntry;
  loading: boolean;
  error: string | null;
  optedIn: boolean;
  optInBusy: boolean;
  optInError: string | null;
  onOptInChange: (next: boolean) => void;
};

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
    <li className={`leaderboard-row${entry.isCurrentUser ? " leaderboard-row--me" : ""}`}>
      <span className="leaderboard-rank" aria-hidden="true">
        {entry.rank}
      </span>
      <span className="leaderboard-name">
        {entry.displayName}
        {entry.isCurrentUser && <span className="leaderboard-you"> (you)</span>}
      </span>
      <span className="leaderboard-points">{formatPts(entry.lifetimePoints)}</span>
    </li>
  );
}

// Neighbourhood rankings of volunteers who chose to appear. Each person decides for themselves
// with the switch; names are a first name and last initial only.
export function Leaderboard({
  entries,
  me,
  loading,
  error,
  optedIn,
  optInBusy,
  optInError,
  onOptInChange,
}: LeaderboardProps) {
  const id = useId();
  const outsideTop = me !== undefined && !entries.some((entry) => entry.isCurrentUser);

  return (
    <InfoCard ariaLabel="Neighbourhood rankings">
      <div className="feature-card">
        <div className="feature-card-head">
          <span className="inline-icon ui-strong">Neighbourhood rankings</span>
        </div>

        <div className="settings-row">
          <label className="settings-row-text" htmlFor={id}>
            <span className="settings-row-label">Show me in Rankings</span>
            <span className="ui-meta-row">
              Only your first name and last initial are shown. You can switch this off any time.
            </span>
          </label>
          <input
            id={id}
            type="checkbox"
            role="switch"
            className="settings-switch"
            checked={optedIn}
            disabled={optInBusy}
            onChange={(event) => onOptInChange(event.target.checked)}
          />
        </div>
        {optInError && (
          <p className="ui-error ui-flush" role="alert">
            {optInError}
          </p>
        )}

        {loading ? (
          <LoadingState rows={1} label="Loading Rankings" />
        ) : error ? (
          <EmptyState icon={CloudOff} title="Couldn't load Rankings" description={error} />
        ) : entries.length === 0 && !me ? (
          <EmptyState
            icon={Trophy}
            title="No one is in Rankings yet"
            description="Switch it on above to be the first."
          />
        ) : (
          <ol className="leaderboard" aria-label="Rankings">
            {entries.map((entry) => (
              <Row key={`${entry.rank}-${entry.displayName}`} entry={entry} />
            ))}
            {outsideTop && me && <Row entry={me} />}
          </ol>
        )}
      </div>
    </InfoCard>
  );
}
