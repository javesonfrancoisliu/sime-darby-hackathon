import { useNavigate } from "react-router-dom";
import { usePoints, useStreak } from "../../hooks/useChallengesData";
import { Banner } from "../../ui/Banner";
import { IconCheck, IconFlame, IconHandHeart, IconSparkles } from "../../ui/Icons";
import { Spinner } from "../../ui/Spinner";

// Points and streak for Home. A slow or failed call only affects this card, never the rest of Home.
export function CommunityPlayCard() {
  const navigate = useNavigate();
  const points = usePoints();
  const streak = useStreak();
  const loading =
    (points.status === "loading" && !points.data) || (streak.status === "loading" && !streak.data);
  const failed =
    points.status === "error" && !points.data
      ? points
      : streak.status === "error" && !streak.data
        ? streak
        : null;

  return (
    <section className="app-home__section" aria-labelledby="community-play-heading">
      <div className="app-cta-card">
        <h2 id="community-play-heading" className="app-cta-card__title">
          Community Play
        </h2>
        {failed ? (
          <Banner
            message={failed.error?.message ?? "We could not load your points."}
            onRetry={() => {
              points.refetch();
              streak.refetch();
            }}
          />
        ) : loading ? (
          <Spinner label="Loading your points" />
        ) : (
          <div className="play-summary">
            <div className="play-summary__points">
              <span className="play-summary__points-icon" aria-hidden="true">
                <IconSparkles size={22} strokeWidth={1.8} />
              </span>
              <div>
                <span className="play-summary__points-value">{points.data?.points ?? 0}</span>
                <span className="play-summary__points-label">neighbour points</span>
              </div>
            </div>
            <div className="play-summary__streak">
              <span className="play-summary__streak-flame" aria-hidden="true">
                <IconFlame size={20} strokeWidth={1.8} />
              </span>
              <div>
                <span className="play-summary__streak-value">{streak.data?.current ?? 0}</span>
                <span className="play-summary__streak-label">day streak</span>
              </div>
            </div>
          </div>
        )}
        <div className="app-cta-card__actions">
          <button
            type="button"
            className="ui-button ui-button--primary app-cta-card__btn"
            onClick={() => navigate("/challenges")}
          >
            <IconCheck size={18} strokeWidth={2.4} aria-hidden="true" />
            <span>I am okay</span>
          </button>
          <button
            type="button"
            className="ui-button ui-button--secondary app-cta-card__btn--secondary"
            onClick={() => navigate("/challenges#rewards")}
          >
            <IconSparkles size={18} strokeWidth={2} aria-hidden="true" />
            <span>Goals and rewards</span>
          </button>
        </div>
      </div>
    </section>
  );
}

// Shortcuts into the Community screen for volunteering and township notices.
export function AroundTownshipCard() {
  const navigate = useNavigate();
  return (
    <section className="app-home__section" aria-labelledby="around-township-heading">
      <div className="app-cta-card">
        <h2 id="around-township-heading" className="app-cta-card__title">
          Around the township
        </h2>
        <div className="app-cta-card__actions">
          <button
            type="button"
            className="ui-button ui-button--secondary app-cta-card__btn--secondary"
            onClick={() => navigate("/community#volunteer")}
          >
            <IconHandHeart size={18} strokeWidth={2} aria-hidden="true" />
            <span>Volunteering</span>
          </button>
          <button
            type="button"
            className="ui-button ui-button--secondary app-cta-card__btn--secondary"
            onClick={() => navigate("/community#maintenance")}
          >
            <span>Notices</span>
          </button>
        </div>
      </div>
    </section>
  );
}
