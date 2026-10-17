import type { LeaderboardEntry } from "../../types/gamification";
import { DemoTag, InfoCard } from "../ui";

export type LeaderboardProps = {
  entries: LeaderboardEntry[];
};

/**
 * Compact neighbourhood leaderboard. Fictional residents + simulated scores; the
 * current user's row is highlighted. Display names only — no personal data.
 */
export function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <InfoCard ariaLabel="Neighbourhood leaderboard">
      <div className="feature-card">
        <div className="feature-card-head">
          <span className="inline-icon" style={{ fontWeight: 700 }}>
            Neighbourhood leaderboard
          </span>
          <DemoTag />
        </div>
        <ol className="leaderboard" aria-label="Rankings">
          {entries.map((entry) => (
            <li
              key={`${entry.rank}-${entry.displayName}`}
              className={`leaderboard-row${entry.isCurrentUser ? " leaderboard-row--me" : ""}`}
            >
              <span className="leaderboard-rank" aria-hidden="true">
                {entry.rank}
              </span>
              <span className="leaderboard-name">
                {entry.displayName}
                {entry.isCurrentUser && <span className="leaderboard-you"> (you)</span>}
              </span>
              <span className="leaderboard-points">{entry.points} pts</span>
            </li>
          ))}
        </ol>
      </div>
    </InfoCard>
  );
}
