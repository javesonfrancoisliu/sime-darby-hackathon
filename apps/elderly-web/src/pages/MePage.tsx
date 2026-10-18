import { useAccessibility } from "../context/AccessibilityContext";
import {
  IconUser,
  IconMapPin,
  IconShieldCheck,
  IconSliders,
  IconPhone,
  IconHeartPulse,
  IconChevronRight,
  IconVolume2,
} from "../ui/Icons";

/**
 * Me / Senior Profile Page — Apple Health & Apple ID style for Silver Generation.
 * Incorporates:
 * - Inset-grouped settings cards (§12)
 * - One-tap access to Accessibility Control Center
 * - Township resident credentials & safety emergency numbers
 */
export function MePage() {
  const { openSheet, fontSize, highContrast, voiceAssist, speak } = useAccessibility();

  function handleReadProfile() {
    speak(
      "Profile for Aminah. Verified township resident at Elmina West, Shah Alam. Display settings: font size is set to " +
        fontSize +
        ", high contrast is " +
        (highContrast ? "on" : "off") +
        ". Emergency contacts are ready.",
    );
  }

  return (
    <div className="apple-subpage apple-profile-page">
      {/* ── Apple-style Profile Header ───────────────────────── */}
      <div className="apple-profile-hero">
        <div className="apple-profile-avatar-wrap">
          <div className="apple-profile-avatar" aria-hidden="true">
            <IconUser size={38} strokeWidth={1.8} />
          </div>
          <span className="apple-profile-verified-badge" title="Verified Elmina Resident">
            <IconShieldCheck size={16} strokeWidth={2.4} />
          </span>
        </div>

        <h1 className="ui-page-title" style={{ marginTop: 12, marginBottom: 4 }}>
          Aminah
        </h1>
        <p className="apple-profile-location">
          <IconMapPin size={14} strokeWidth={2} style={{ verticalAlign: "-2px", marginRight: 4 }} />
          Elmina West, Shah Alam
        </p>

        <button
          type="button"
          className="ui-button ui-button--ghost apple-profile-voice-btn"
          onClick={handleReadProfile}
          aria-label="Read profile aloud"
        >
          <IconVolume2 size={16} strokeWidth={2} style={{ marginRight: 6 }} />
          <span>Read profile aloud</span>
        </button>
      </div>

      {/* ── Section 1: Senior Display & Accessibility ─────────── */}
      <div className="apple-profile-section">
        <span className="apple-profile-section-title">Senior Display &amp; Audio</span>
        <div className="apple-inset-group">
          <button
            type="button"
            className="apple-inset-btn-row"
            onClick={openSheet}
            aria-label="Open Senior Accessibility and Display Settings"
          >
            <div className="apple-inset-btn-row__left">
              <span className="apple-inset-btn-row__icon" aria-hidden="true">
                <IconSliders size={20} strokeWidth={1.8} />
              </span>
              <div>
                <span className="apple-inset-btn-row__title">Accessibility Controls</span>
                <span className="apple-inset-btn-row__subtitle">
                  Size: {fontSize.toUpperCase()} · Contrast: {highContrast ? "High" : "Normal"} · Voice: {voiceAssist ? "On" : "Off"}
                </span>
              </div>
            </div>
            <span className="apple-card-button__arrow" aria-hidden="true">
              <IconChevronRight size={18} strokeWidth={2} />
            </span>
          </button>
        </div>
      </div>

      {/* ── Section 2: Medical & Emergency Quick Access ────────── */}
      <div className="apple-profile-section">
        <span className="apple-profile-section-title">Emergency &amp; Medical ID</span>
        <div className="apple-inset-group">
          <div className="apple-inset-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconHeartPulse size={18} strokeWidth={1.8} style={{ color: "var(--brand-primary)" }} />
              <span className="app-detail-label" style={{ margin: 0 }}>Blood Group</span>
            </div>
            <span className="apple-inset-value" style={{ fontWeight: 700 }}>O Positive</span>
          </div>

          <div className="apple-inset-row">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconPhone size={18} strokeWidth={1.8} style={{ color: "var(--brand-primary)" }} />
              <span className="app-detail-label" style={{ margin: 0 }}>Next of Kin</span>
            </div>
            <span className="apple-inset-value">Zainal (Son) · 012-345 6789</span>
          </div>

          <a href="tel:0378398888" className="apple-inset-btn-row" style={{ textDecoration: "none" }}>
            <div className="apple-inset-btn-row__left">
              <span className="apple-inset-btn-row__icon" style={{ color: "var(--brand-primary)" }}>
                <IconPhone size={18} strokeWidth={2} />
              </span>
              <div>
                <span className="apple-inset-btn-row__title">Elmina Auxiliary Police</span>
                <span className="apple-inset-btn-row__subtitle">Township Security (24/7 Hotline)</span>
              </div>
            </div>
            <span style={{ fontWeight: 700, color: "var(--brand-primary)", fontSize: 14 }}>
              03-7839 8888
            </span>
          </a>
        </div>
      </div>

      {/* ── Section 3: Township Community Stats ───────────────── */}
      <div className="apple-profile-section" style={{ marginBottom: 32 }}>
        <span className="apple-profile-section-title">Township Community</span>
        <div className="apple-inset-group">
          <div className="apple-inset-row">
            <span className="app-detail-label">Community Status</span>
            <span className="apple-meta-pill" style={{ background: "#D1FAE5", color: "#065F46" }}>
              Active Elder Resident
            </span>
          </div>
          <div className="apple-inset-row">
            <span className="app-detail-label">Township Sector</span>
            <span className="apple-inset-value">Elmina West, Sector 3B</span>
          </div>
        </div>
      </div>
    </div>
  );
}
