import { useNavigate } from "react-router-dom";
import { usePoints, useRewards, useUseReward } from "../../hooks/useChallengesData";
import { formatDate } from "../../requests/schedule";
import { Banner } from "../../ui/Banner";
import { IconSparkles } from "../../ui/Icons";
import { Sheet } from "../../ui/Sheet";
import { Spinner } from "../../ui/Spinner";

interface MyRewardsSheetProps {
  open: boolean;
  onClose: () => void;
}

// Points, the vouchers already claimed, and the way to the rewards still on offer.
export function MyRewardsSheet({ open, onClose }: MyRewardsSheetProps) {
  const navigate = useNavigate();
  const points = usePoints();
  const rewards = useRewards();
  const useVoucher = useUseReward();
  const claimed = (rewards.data ?? []).filter((r) => r.status === "redeemed");

  async function handleUse(id: string) {
    const result = await useVoucher.run(id);
    if (!result) return;
    rewards.update((list) =>
      list.map((r) =>
        r.id === id ? { ...r, usedAt: result.usedAt ?? new Date().toISOString() } : r,
      ),
    );
  }

  function seeAvailable() {
    onClose();
    // Replaces the sheet's history entry so Back from Rewards lands on Profile.
    navigate("/challenges#rewards", { replace: true });
  }

  return (
    <Sheet open={open} onClose={onClose} title="My rewards" subtitle="Your points and vouchers">
      <div className="apple-sheet-content">
        <div className="play-summary__points">
          <span className="play-summary__points-icon" aria-hidden="true">
            <IconSparkles size={22} strokeWidth={1.8} />
          </span>
          <div>
            <span className="play-summary__points-value">{points.data?.points ?? 0}</span>
            <span className="play-summary__points-label">neighbour points</span>
          </div>
        </div>

        {points.status === "error" && !points.data ? (
          <Banner
            message={points.error?.message ?? "We could not load your points."}
            onRetry={points.refetch}
          />
        ) : null}

        <h3 className="apple-control-label">Vouchers you have claimed</h3>
        {rewards.status === "loading" && !rewards.data ? (
          <Spinner label="Loading your vouchers" />
        ) : null}
        {rewards.status === "error" && !rewards.data ? (
          <Banner
            message={rewards.error?.message ?? "We could not load your vouchers."}
            onRetry={rewards.refetch}
          />
        ) : null}
        {rewards.data && claimed.length === 0 ? (
          <p className="ui-page-subtitle">You have not claimed any vouchers yet.</p>
        ) : null}
        {useVoucher.status === "error" ? (
          <Banner message={useVoucher.error?.message ?? "We could not use that voucher."} />
        ) : null}
        <ul className="ui-stack voucher-list">
          {claimed.map((r) => (
            <li key={r.id} className="play-reward">
              <div className="play-reward__body">
                <p className="play-reward__title">{r.title}</p>
                {r.partner ? <p className="play-reward__partner">{r.partner}</p> : null}
                <p className="play-reward__partner">
                  {r.usedAt
                    ? `Used on ${formatDate(r.usedAt)}`
                    : r.expiresAt
                      ? `Valid until ${formatDate(r.expiresAt)}`
                      : "Ready to use"}
                </p>
              </div>
              <button
                type="button"
                className="community-register-btn"
                aria-label={r.usedAt ? undefined : `Use now: ${r.title}`}
                disabled={Boolean(r.usedAt) || useVoucher.status === "loading"}
                onClick={() => void handleUse(r.id)}
              >
                {r.usedAt ? "Used" : "Use now"}
              </button>
            </li>
          ))}
        </ul>

        <button type="button" className="ui-button ui-button--primary" onClick={seeAvailable}>
          See available rewards
        </button>
      </div>
    </Sheet>
  );
}
