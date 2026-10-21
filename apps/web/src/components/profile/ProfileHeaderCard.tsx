import type { MouseEvent } from "react";
import { MapPin, Pencil } from "lucide-react";
import { useSession } from "@sdh/api-client";
import type { ContributionsResponse } from "@sdh/contracts";

import { useProfile } from "../../data/ProfileContext";
import { useApiResource } from "../../data/useApiResource";
import { volunteerLevel } from "../../lib/volunteerLevel";
import { VolunteerLevelBadge } from "../volunteer/VolunteerLevelBadge";
import { AppButton, InfoCard, ProgressBar } from "../ui";
import { Avatar } from "./Avatar";

export type ProfileHeaderCardProps = {
  claimedCount: number;
  onEdit: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function ProfileHeaderCard({ onEdit }: ProfileHeaderCardProps) {
  const { prefs } = useProfile();
  const { userId } = useSession();
  const contributions = useApiResource<ContributionsResponse>(
    userId ? "/api/contributions/mine" : null,
  );
  const completed = contributions.data?.completedCount;
  const level = completed === undefined ? null : volunteerLevel(completed);
  return (
    <InfoCard ariaLabel="Your profile">
      <div className="profile-header profile-header--level">
        <Avatar name={prefs.displayName} />
        <div className="profile-header-body">
          <h2 className="profile-name">{prefs.displayName}</h2>
          <span className="inline-icon ui-meta-row">
            <MapPin size={14} aria-hidden="true" />
            {prefs.area}
          </span>
          <div className="profile-header-badges">
            {completed !== undefined && <VolunteerLevelBadge completed={completed} />}
          </div>
        </div>
        <AppButton variant="secondary" onClick={onEdit} aria-label="Edit personal information">
          <Pencil size={16} aria-hidden="true" /> Edit
        </AppButton>
      </div>
      <div className="profile-volunteer-progress">
        {contributions.loading ? (
          <p className="ui-meta-row" role="status">
            Loading volunteer progress...
          </p>
        ) : contributions.error ? (
          <div className="ui-stack ui-gap-2">
            <p className="ui-meta-row">Couldn't load volunteer progress.</p>
            <AppButton variant="secondary" onClick={() => void contributions.reload()}>
              Try again
            </AppButton>
          </div>
        ) : completed !== undefined && level ? (
          <>
            <div className="profile-volunteer-progress__heading">
              <strong>Volunteer progress</strong>
              <span>
                {level.next ? `${completed} / ${level.next.minimum} tasks` : `${completed} tasks`}
              </span>
            </div>
            <ProgressBar
              value={level.next ? completed : 25}
              max={level.next?.minimum ?? 25}
              label="Volunteer level progress"
            />
            <p className="ui-meta-row ui-flush">
              {level.next
                ? `${level.next.minimum - completed} more ${level.next.minimum - completed === 1 ? "task" : "tasks"} to reach ${level.next.name}`
                : "You've reached Community Hero, the highest volunteer level!"}
            </p>
          </>
        ) : null}
      </div>
    </InfoCard>
  );
}
