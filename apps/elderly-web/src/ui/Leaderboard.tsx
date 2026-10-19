interface LeaderboardRow {
  displayName: string;
  points: number;
  isCurrentUser?: boolean;
}

interface LeaderboardProps {
  /** Other neighbours (display names only, no personal data). */
  others: { displayName: string; points: number }[];
  /** The resident's own live points — merged in and highlighted. */
  myPoints: number;
  /** The resident's own name; a neighbour row with the same name is dropped so nobody shows twice. */
  myName: string;
}

/**
 * Compact neighbourhood leaderboard (ported from the volunteer app's design).
 * Fictional neighbours + the resident's live points; the resident's own row is
 * highlighted with "(you)". Display names only. Ranked high to low.
 */
export function Leaderboard({ others, myPoints, myName }: LeaderboardProps) {
  const me = myName.trim();
  const rows: LeaderboardRow[] = [
    ...others
      .filter((o) => o.displayName.toLowerCase() !== me.toLowerCase())
      .map((o) => ({ ...o })),
    { displayName: me || "You", points: myPoints, isCurrentUser: true },
  ].sort((a, b) => b.points - a.points);

  return (
    <div className="leaderboard-card">
      <h2 className="leaderboard-card__title">Neighbourhood leaderboard</h2>
      <ol className="leaderboard" aria-label="Neighbour rankings by points">
        {rows.map((entry, i) => (
          <li
            key={`${entry.displayName}-${i}`}
            className={`leaderboard-row${entry.isCurrentUser ? " leaderboard-row--me" : ""}`}
          >
            <span className="leaderboard-rank" aria-hidden="true">
              {i + 1}
            </span>
            <span className="leaderboard-name">
              {entry.displayName}
              {entry.isCurrentUser ? <span className="leaderboard-you"> (you)</span> : null}
            </span>
            <span className="leaderboard-points">{entry.points} pts</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// A small fixed set of fellow neighbours for the demo leaderboard.
export const NEIGHBOUR_LEADERBOARD: { displayName: string; points: number }[] = [
  { displayName: "Auntie Mary", points: 320 },
  { displayName: "Encik Rahman", points: 285 },
  { displayName: "Uncle Lim", points: 240 },
  { displayName: "Kak Siti", points: 180 },
  { displayName: "Pak Hassan", points: 150 },
];
