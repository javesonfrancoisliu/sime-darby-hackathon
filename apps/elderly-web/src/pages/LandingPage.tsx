import { useNavigate } from "react-router-dom";

type Role = "elder" | "volunteer";

interface RoleCard {
  role: Role;
  icon: string;
  title: string;
  subtitle: string;
  path: string;
}

const ROLES: RoleCard[] = [
  {
    role: "elder",
    icon: "🏠",
    title: "I need help",
    subtitle: "Request assistance from a verified neighbour volunteer",
    path: "/home",
  },
  {
    role: "volunteer",
    icon: "🤝",
    title: "I want to help",
    subtitle: "Offer your time and skills to neighbours in the township",
    path: "/home",
  },
];

/**
 * Landing page — full-screen welcome with SDP branding and role selector.
 * Routes to /home after the user picks a role (Elder or Volunteer).
 * No AppShell / tab bar on this screen.
 */
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="app-landing">
      {/* ── Branding section ─────────────────────────────── */}
      <div className="app-landing__hero">
        <div className="app-landing__logo" aria-label="Sime Darby Property">
          <span className="app-landing__logo-sdp">SDP</span>
        </div>
        <h1 className="app-landing__title">Help a Neighbour</h1>
        <p className="app-landing__tagline">
          Connecting the Elmina community — request help, offer time, stay informed.
        </p>
        <div className="app-landing__location-chip">
          <span aria-hidden="true">📍</span> Elmina West, Shah Alam
        </div>
      </div>

      {/* ── Role selector ────────────────────────────────── */}
      <div className="app-landing__body">
        <p className="app-landing__prompt">How would you like to continue today?</p>

        <div className="app-landing__roles">
          {ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              className="app-landing__role-card"
              onClick={() => navigate(r.path)}
            >
              <span className="app-landing__role-icon" aria-hidden="true">
                {r.icon}
              </span>
              <span className="app-landing__role-title">{r.title}</span>
              <span className="app-landing__role-sub">{r.subtitle}</span>
              <span className="app-landing__role-arrow" aria-hidden="true">›</span>
            </button>
          ))}
        </div>

        {/* ── Quick access strip ───────────────────────── */}
        <div className="app-landing__quick">
          <p className="app-landing__quick-label">Quick access</p>
          <div className="app-landing__quick-grid">
            {[
              { icon: "🌫️", label: "Haze", path: "/safety#haze" },
              { icon: "🌡️", label: "Weather", path: "/safety#temp" },
              { icon: "🏚️", label: "Facilities", path: "/safety#facilities" },
              { icon: "📅", label: "Events", path: "/community#events" },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                className="app-landing__quick-item"
                onClick={() => navigate(q.path)}
              >
                <span className="app-landing__quick-icon" aria-hidden="true">{q.icon}</span>
                <span className="app-landing__quick-label-text">{q.label}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="app-landing__footer">
          Powered by <strong>Sime Darby Property</strong> · Township Connect
        </p>
      </div>
    </div>
  );
}
