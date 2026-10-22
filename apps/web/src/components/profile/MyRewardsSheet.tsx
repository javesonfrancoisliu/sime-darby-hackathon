import { useState, type RefObject } from "react";
import { CloudOff, Gift } from "lucide-react";
import { Link } from "react-router-dom";

import { errorMessage } from "@sdh/api-client";
import { voucherExpiry, type RewardWithStatus } from "@sdh/contracts";

import { consumeRewardVoucher } from "../../data/useGamification";
import { formatDate, formatPoints } from "../../lib/format";
import { useConfirm } from "../../lib/useConfirm";
import { useNow } from "../../lib/useNow";
import {
  AppButton,
  ConfirmActionDialog,
  EmptyState,
  LoadingState,
  Sheet,
  StatusBadge,
} from "../ui";

export type MyRewardsSheetProps = {
  onClose: () => void;
  openerRef: RefObject<HTMLElement | null>;
  // The person's points, when they have loaded.
  points?: number;
  // Redeemed rewards, newest first.
  claimed: RewardWithStatus[];
  loading?: boolean;
  error?: string | null;
  onUsed: () => Promise<void>;
};

// Profile -> My rewards: the points balance and the vouchers the person has redeemed. Available
// rewards, badges and Rankings stay in Community Challenges.
export function MyRewardsSheet({
  onClose,
  openerRef,
  points,
  claimed,
  loading = false,
  error = null,
  onUsed,
}: MyRewardsSheetProps) {
  const confirm = useConfirm();
  const now = useNow(60000);
  const [useError, setUseError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function askUse(reward: RewardWithStatus) {
    setUseError(null);
    confirm.ask({
      title: "Use this voucher now?",
      message: `Use "${reward.title}" now? It will be marked as claimed.`,
      confirmLabel: "Yes, use now",
      onConfirm: async () => {
        setBusyId(reward.id);
        try {
          await consumeRewardVoucher(reward.id);
          await onUsed();
        } catch (err) {
          setUseError(errorMessage(err));
        } finally {
          setBusyId(null);
        }
      },
    });
  }

  return (
    <>
      <Sheet open onClose={onClose} openerRef={openerRef} title="My rewards">
        <div className="sheet-stack">
          {points !== undefined && (
            <p className="ui-flush">
              You have <strong>{formatPoints(points)}</strong>.
            </p>
          )}

          {loading ? (
            <LoadingState rows={1} label="Loading your rewards" />
          ) : error ? (
            <EmptyState icon={CloudOff} title="Couldn't load your rewards" description={error} />
          ) : claimed.length === 0 ? (
            <EmptyState
              icon={Gift}
              title="No vouchers yet"
              description="Redeem a reward in Community Challenges and it will appear here."
            />
          ) : (
            <ul className="community-list ui-stack ui-gap-2">
              {claimed.map((reward) => {
                const expiresAt =
                  reward.expiresAt ??
                  (reward.redeemedAt ? voucherExpiry(reward.redeemedAt) : undefined);
                const expired = !!expiresAt && Date.parse(expiresAt) <= now;
                return (
                  <li key={reward.id} className="claimed-reward">
                    <div className="claimed-reward-body">
                      <span className="claimed-reward-title">{reward.title}</span>
                      {reward.usedAt ? (
                        <span className="ui-meta-row">Claimed {formatDate(reward.usedAt)}</span>
                      ) : expiresAt ? (
                        <span className="ui-meta-row">
                          {expired ? "Expired" : "Expires"} {formatDate(expiresAt)}
                        </span>
                      ) : null}
                      {reward.partner && <span className="ui-meta-row">{reward.partner}</span>}
                    </div>
                    {reward.usedAt ? (
                      <StatusBadge label="Claimed" variant="success" />
                    ) : expired ? (
                      <StatusBadge label="Expired" variant="info" />
                    ) : (
                      <AppButton
                        variant="primary"
                        loading={busyId === reward.id}
                        aria-label={`Use ${reward.title}`}
                        onClick={() => askUse(reward)}
                      >
                        Use now
                      </AppButton>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {useError && (
            <p role="alert" className="ui-error">
              {useError}
            </p>
          )}

          <p className="ui-flush">
            <Link to="/community/challenges?tab=rewards">See available rewards</Link>
          </p>
        </div>
      </Sheet>
      <ConfirmActionDialog
        open={confirm.open}
        title={confirm.request?.title ?? ""}
        message={confirm.request?.message ?? ""}
        confirmLabel={confirm.request?.confirmLabel}
        cancelLabel="Not yet"
        busy={confirm.busy}
        onConfirm={confirm.confirm}
        onCancel={confirm.cancel}
      />
    </>
  );
}
