import { useState } from "react";
import { FONT_LABEL, useAccessibility } from "../context/AccessibilityContext";
import { tokenModeEnabled } from "../config";
import { usePoints, useRewards } from "../hooks/useChallengesData";
import { useMedicalId } from "../hooks/useMedicalId";
import { bloodGroupText } from "../medical/bloodGroup";
import { useResident } from "../session/useResident";
import { HubRow } from "../ui/HubRow";
import { PageHeaderActions } from "../ui/PageHeaderActions";
import {
  IconGift,
  IconHeartPulse,
  IconMapPin,
  IconPencil,
  IconPhone,
  IconSliders,
  IconUser,
} from "../ui/Icons";
import { EditProfileSheet } from "./me/EditProfileSheet";
import { AccountSheet } from "./me/AccountSheet";
import { HelpSafetySheet } from "./me/HelpSafetySheet";
import { MyDetailsSheet } from "./me/MyDetailsSheet";
import { MyRewardsSheet } from "./me/MyRewardsSheet";

type MeSheet = "edit" | "rewards" | "details" | "help" | "account" | null;

function rewardsSummary(points: number | undefined, vouchers: number | undefined): string {
  if (points === undefined) return "Points and vouchers";
  const voucherText =
    vouchers === undefined ? "" : ` · ${vouchers} ${vouchers === 1 ? "voucher" : "vouchers"}`;
  return `${points} points${voucherText}`;
}

// Profile hub: who is signed in, then one large row each for rewards, details, settings and help.
export function MePage() {
  const { openSheet, fontSize, highContrast, speak } = useAccessibility();
  const resident = useResident();
  const points = usePoints();
  const rewards = useRewards();
  const medical = useMedicalId();
  const [sheet, setSheet] = useState<MeSheet>(null);
  const name = resident?.name ?? "";
  const area = resident?.area ?? "";
  const vouchers = rewards.data?.filter((r) => r.status === "redeemed").length;

  const medicalSummary = medical.data
    ? `Medical ID saved · Blood group ${bloodGroupText(medical.data.bloodGroup)}`
    : medical.status === "error"
      ? medical.error?.code === "NOT_FOUND"
        ? "No Medical ID yet"
        : "Medical ID and township sector"
      : "Medical ID and township sector";

  function handleReadProfile() {
    speak(
      `Profile for ${name}. Township resident at ${area}. Text size is ` +
        FONT_LABEL[fontSize] +
        ", strong contrast is " +
        (highContrast ? "on" : "off") +
        ".",
    );
  }

  return (
    <div className="apple-subpage apple-profile-page">
      <div className="apple-profile-topbar">
        <PageHeaderActions onReadAloud={handleReadProfile} />
      </div>

      <div className="apple-profile-hero">
        <div className="apple-profile-avatar-wrap">
          <div className="apple-profile-avatar" aria-hidden="true">
            <IconUser size={38} strokeWidth={1.8} />
          </div>
        </div>

        <h1 className="ui-page-title mt-3 mb-1">{name}</h1>
        <p className="apple-profile-location">
          <IconMapPin className="icon-inline-low" size={14} strokeWidth={2} />
          {area}
        </p>

        {resident ? (
          <button
            type="button"
            className="ui-button ui-button--secondary"
            onClick={() => setSheet("edit")}
          >
            <IconPencil className="icon-gap" size={18} strokeWidth={2} aria-hidden="true" />
            <span>Edit</span>
          </button>
        ) : null}
      </div>

      <div className="apple-profile-section mb-8">
        <div className="apple-inset-group">
          <HubRow
            icon={<IconGift size={20} strokeWidth={1.8} />}
            title="My rewards"
            summary={rewardsSummary(points.data?.points, vouchers)}
            onClick={() => setSheet("rewards")}
          />
          <HubRow
            icon={<IconHeartPulse size={20} strokeWidth={1.8} />}
            title="My details"
            summary={medicalSummary}
            onClick={() => setSheet("details")}
          />
          <HubRow
            icon={<IconSliders size={20} strokeWidth={1.8} />}
            title="Settings"
            summary={`Text size: ${FONT_LABEL[fontSize]} · Strong contrast: ${highContrast ? "On" : "Off"}`}
            onClick={openSheet}
          />
          <HubRow
            icon={<IconPhone size={20} strokeWidth={1.8} />}
            title="Help and safety"
            summary="Township security and 999"
            onClick={() => setSheet("help")}
          />
          <HubRow
            icon={<IconUser size={20} strokeWidth={1.8} />}
            title="Account"
            summary={
              tokenModeEnabled() ? "Account settings and sign out" : "Switch to another person"
            }
            onClick={() => setSheet("account")}
          />
        </div>
      </div>

      {resident ? (
        <EditProfileSheet
          open={sheet === "edit"}
          onClose={() => setSheet(null)}
          resident={resident}
        />
      ) : null}
      {sheet === "rewards" ? <MyRewardsSheet open onClose={() => setSheet(null)} /> : null}
      {sheet === "details" ? <MyDetailsSheet open onClose={() => setSheet(null)} /> : null}
      <HelpSafetySheet open={sheet === "help"} onClose={() => setSheet(null)} />
      <AccountSheet open={sheet === "account"} onClose={() => setSheet(null)} />
    </div>
  );
}
