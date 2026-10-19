import { useNavigate } from "react-router-dom";
import { useSession } from "@sdh/api-client";
import { FONT_LABEL, useAccessibility } from "../context/AccessibilityContext";
import { tokenModeEnabled } from "../config";
import { useMedicalId } from "../hooks/useMedicalId";
import { useTownship } from "../hooks/useTownship";
import { bloodGroupText } from "../medical/bloodGroup";
import { Spinner } from "../ui/Spinner";
import { Banner } from "../ui/Banner";
import { useResident } from "../session/useResident";
import { PageHeaderActions } from "../ui/PageHeaderActions";
import { useCallConfirm } from "../ui/CallConfirm";
import { LevelBadge } from "../ui/LevelBadge";
import {
  IconUser,
  IconMapPin,
  IconSliders,
  IconPhone,
  IconHeartPulse,
  IconChevronRight,
  IconUsers,
  IconVolume2,
  IconPencil,
  IconPlus,
} from "../ui/Icons";

// Me page: who is signed in, one-tap text and sound settings, and the township
// security number. The Medical ID is the resident's own, saved on the server.
export function MePage() {
  const { openSheet, fontSize, highContrast, voiceAssist, speak } = useAccessibility();
  const { requestCall } = useCallConfirm();
  const resident = useResident();
  const { signOut } = useSession();
  const navigate = useNavigate();
  const medical = useMedicalId();
  const township = useTownship();
  const securityLine = township.data?.securityLine;
  const name = resident?.name ?? "";
  const area = resident?.area ?? "";

  function switchPerson() {
    navigate("/");
    signOut();
  }

  async function signOutOfAccount() {
    await signOut();
    window.location.assign("/");
  }

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
        <div className="apple-profile-level">
          <LevelBadge level={2} variant="full" />
        </div>

        <button
          type="button"
          className="ui-button ui-button--ghost apple-profile-voice-btn"
          onClick={handleReadProfile}
          aria-label="Read profile aloud"
        >
          <IconVolume2 className="icon-gap" size={16} strokeWidth={2} />
          <span>Read profile aloud</span>
        </button>

        {tokenModeEnabled() ? (
          <>
            <a href="/account" className="ui-button ui-button--secondary">
              <IconUser className="icon-gap" size={18} strokeWidth={2} />
              <span>Account settings</span>
            </a>
            <button
              type="button"
              className="ui-button ui-button--secondary"
              onClick={signOutOfAccount}
            >
              <span>Sign out</span>
            </button>
          </>
        ) : (
          <button type="button" className="ui-button ui-button--secondary" onClick={switchPerson}>
            <IconUsers className="icon-gap" size={18} strokeWidth={2} />
            <span>Switch person</span>
          </button>
        )}
      </div>

      <div className="apple-profile-section">
        <span className="apple-profile-section-title">Reading and sound</span>
        <div className="apple-inset-group">
          <button
            type="button"
            className="apple-inset-btn-row no-underline"
            onClick={openSheet}
            aria-label="Open text and sound settings"
          >
            <div className="apple-inset-btn-row__left">
              <span className="apple-inset-btn-row__icon" aria-hidden="true">
                <IconSliders size={20} strokeWidth={1.8} />
              </span>
              <div>
                <span className="apple-inset-btn-row__title">Text and sound settings</span>
                <span className="apple-inset-btn-row__subtitle">
                  Text size: {FONT_LABEL[fontSize]} · Strong contrast: {highContrast ? "On" : "Off"}{" "}
                  · Read aloud: {voiceAssist ? "On" : "Off"}
                </span>
              </div>
            </div>
            <span className="apple-card-button__arrow" aria-hidden="true">
              <IconChevronRight size={18} strokeWidth={2} />
            </span>
          </button>
        </div>
      </div>

      <div className="apple-profile-section">
        <span className="apple-profile-section-title">Emergency &amp; Medical ID</span>
        <div className="apple-inset-group">
          {medical.status === "loading" && !medical.data ? (
            <div className="apple-inset-row">
              <Spinner label="Loading your Medical ID" />
            </div>
          ) : null}

          {medical.status === "error" && medical.error?.code !== "NOT_FOUND" ? (
            <Banner
              message={medical.error?.message ?? "We could not load your Medical ID."}
              onRetry={medical.refetch}
            />
          ) : null}

          {medical.status === "error" && medical.error?.code === "NOT_FOUND" ? (
            <div className="apple-inset-row medical-empty">
              <p className="apple-inset-value m-0">
                Your Medical ID is empty. Add your blood group and a person to call in an emergency.
              </p>
              <button
                type="button"
                className="ui-button ui-button--primary"
                onClick={() => navigate("/me/medical-id")}
              >
                <IconPlus className="icon-gap" size={18} strokeWidth={2.2} aria-hidden="true" />
                <span>Add your Medical ID</span>
              </button>
            </div>
          ) : null}

          {medical.data ? (
            <>
              <div className="apple-inset-row">
                <div className="medical-row__label">
                  <IconHeartPulse className="text-brand" size={18} strokeWidth={1.8} />
                  <span className="app-detail-label m-0">Blood Group</span>
                </div>
                <span className="apple-inset-value text-strong">
                  {bloodGroupText(medical.data.bloodGroup)}
                </span>
              </div>

              <div className="apple-inset-row">
                <div className="medical-row__label">
                  <IconPhone className="text-brand" size={18} strokeWidth={1.8} />
                  <span className="app-detail-label m-0">Emergency contact</span>
                </div>
                <span className="apple-inset-value">
                  {medical.data.nextOfKinName} ({medical.data.nextOfKinRelation}) ·{" "}
                  <button
                    type="button"
                    className="link-button text-nowrap"
                    onClick={() =>
                      requestCall({
                        tel: medical.data!.nextOfKinPhone.replace(/[^\d+]/g, ""),
                        display: medical.data!.nextOfKinPhone,
                        label: `${medical.data!.nextOfKinName} (${medical.data!.nextOfKinRelation})`,
                      })
                    }
                  >
                    {medical.data.nextOfKinPhone}
                  </button>
                </span>
              </div>

              <button
                type="button"
                className="apple-inset-btn-row"
                onClick={() => navigate("/me/medical-id")}
              >
                <div className="apple-inset-btn-row__left">
                  <span className="apple-inset-btn-row__icon text-brand" aria-hidden="true">
                    <IconPencil size={18} strokeWidth={2} />
                  </span>
                  <span className="apple-inset-btn-row__title">Change your Medical ID</span>
                </div>
                <span className="apple-card-button__arrow" aria-hidden="true">
                  <IconChevronRight size={18} strokeWidth={2} />
                </span>
              </button>
            </>
          ) : null}

          {securityLine ? (
            <button
              type="button"
              className="apple-inset-btn-row no-underline"
              onClick={() =>
                requestCall({
                  tel: securityLine.tel,
                  display: securityLine.display,
                  label: "Township security",
                  note: "24/7 township hotline",
                })
              }
            >
              <div className="apple-inset-btn-row__left">
                <span className="apple-inset-btn-row__icon text-brand">
                  <IconPhone size={18} strokeWidth={2} />
                </span>
                <div>
                  <span className="apple-inset-btn-row__title">Township security</span>
                </div>
              </div>
              <span className="text-strong text-brand">{securityLine.display}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="apple-profile-section mb-8">
        <span className="apple-profile-section-title">Township Community</span>
        <div className="apple-inset-group">
          <div className="apple-inset-row">
            <span className="app-detail-label">Township Sector</span>
            <span className="apple-inset-value">{area}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
