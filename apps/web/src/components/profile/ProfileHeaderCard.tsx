import { MapPin, Pencil } from "lucide-react";

import { useProfile } from "../../data/ProfileContext";
import { VerifiedBadge } from "../volunteer";
import { AppButton, DemoTag, InfoCard } from "../ui";
import { Avatar } from "./Avatar";

export type ProfileHeaderCardProps = {
  claimedCount: number;
  onEdit: () => void;
};

// Compact profile header: avatar, display name, neighbourhood, verification
// status (demo-labelled) and a small claimed-reward count. Does NOT repeat the
// tasks/points/leaderboard sections - those live on their own pages.
export function ProfileHeaderCard({ claimedCount, onEdit }: ProfileHeaderCardProps) {
  const { prefs, verification, isDemo } = useProfile();

  return (
    <InfoCard ariaLabel="Your profile">
      <div className="profile-header">
        <Avatar name={prefs.displayName} />
        <div className="profile-header-body">
          <h2 className="profile-name">{prefs.displayName}</h2>
          <span className="inline-icon ui-meta-row">
            <MapPin size={16} className="icon-dim" aria-hidden="true" />
            {prefs.area}
          </span>
          <div className="profile-header-badges">
            <VerifiedBadge status={verification} />
            {isDemo && <DemoTag />}
          </div>
          {claimedCount > 0 && (
            <p className="ui-meta-row ui-flush">
              {claimedCount} claimed reward{claimedCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <AppButton variant="ghost" onClick={onEdit} aria-label="Edit personal information">
          <Pencil size={16} aria-hidden="true" />
          Edit
        </AppButton>
      </div>
    </InfoCard>
  );
}
