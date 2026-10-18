import { useNavigate } from "react-router-dom";
import { useSession } from "@sdh/api-client";
import { FONT_LABEL, useAccessibility } from "../context/AccessibilityContext";
import { DEMO_SECURITY_LINE, isMockMode } from "../config";
import { DemoTag } from "../ui/DemoTag";
import { useResident } from "../session/useResident";
import {
  IconUser,
  IconMapPin,
  IconSliders,
  IconPhone,
  IconChevronRight,
  IconUsers,
  IconVolume2,
} from "../ui/Icons";

// Me page: who is signed in, one-tap text and sound settings, and the township
// security number. Medical details are not stored in this version.
export function MePage() {
  const { openSheet, fontSize, highContrast, voiceAssist, speak } = useAccessibility();
  const resident = useResident();
  const { signOut } = useSession();
  const navigate = useNavigate();
  const name = resident?.name ?? "";
  const area = resident?.area ?? "";

  function switchPerson() {
    navigate("/");
    signOut();
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

        <button
          type="button"
          className="ui-button ui-button--ghost apple-profile-voice-btn"
          onClick={handleReadProfile}
          aria-label="Read profile aloud"
        >
          <IconVolume2 className="icon-gap" size={16} strokeWidth={2} />
          <span>Read profile aloud</span>
        </button>

        {isMockMode() ? null : (
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
          <div className="apple-inset-row medical-empty">
            <div>
              <span className="app-detail-label m-0">Medical details</span>
              <span className="medical-empty__hint">
                Not available yet. Blood group and next of kin cannot be saved in this version.
              </span>
            </div>
          </div>

          <a href={`tel:${DEMO_SECURITY_LINE.tel}`} className="apple-inset-btn-row">
            <div className="apple-inset-btn-row__left">
              <span className="apple-inset-btn-row__icon text-brand">
                <IconPhone size={18} strokeWidth={2} />
              </span>
              <div>
                <span className="apple-inset-btn-row__title">
                  Township security
                  <DemoTag />
                </span>
                <span className="apple-inset-btn-row__subtitle">Demo number, not a real line</span>
              </div>
            </div>
            <span className="text-strong text-brand">{DEMO_SECURITY_LINE.display}</span>
          </a>
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
