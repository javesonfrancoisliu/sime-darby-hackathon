---
inclusion: always
---

# Frontend design instructions — Township Connect

This is a student hackathon prototype **inspired by** Sime Darby Property branding, not its official brand manual.

## Shared design
- Use the shared tokens from `src/styles/design-tokens.css`: primary red `#D71920`, white card backgrounds, page background `#F8F9FA`, text `#1F2937`.
- Inter/system font; heading sizes 30/24/18px, body 16px; 14px minimum for functional small text.
- Button and input height 48px; card radius 16px; use the 4/8/12/16/24/32px spacing scale.
- Reuse `AppShell`, `PageHeader`, `InfoCard`, `StatusBadge`, and `AppButton` rather than making unique substitutes.
- Be accessible and mobile-first: labels on controls, visible focus, 44px+ targets, status as text AND color/icon.
- Do not invent arbitrary hex colors or per-feature navbar/sidebar implementations.

## Feature ownership and URLs
- `/community` is **Module 2 — Centralised Neighbourhood Information** (Justina's module): events, maintenance announcements, volunteering, township updates. Owns `src/components/community/*`.
- `/safety` is **Module 1 — Health & Safety Hazards** (teammate's module): haze, water level, temperature, facility reports. Owns `src/components/safety/*`.
- `/` is shared: compose `CommunityOverview` and `SafetyOverview` into one integrated General Dashboard. Do not duplicate homepage layouts.
- Maintenance announcements (`Scheduled`, `In Progress`, `Completed`) are different from damaged-facility reports (`Reported`, `In Progress`, `Resolved`).
- Label simulated data `Demo data`, alongside timestamps/sources. Never claim simulated readings are live.

Read `DESIGN_SYSTEM.md` and `TEAM_FRONTEND_PLAN.md` before building pages. When generating new UI, preserve these conventions and do not change shared components without coordination.
