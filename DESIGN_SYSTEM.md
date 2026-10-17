# Township Community Platform — Shared Frontend Design System (v1.1)

**Project:** Sime Darby Property University Hackathon 2026  
**Design direction:** Modern, trusted, inclusive township living  
**Status:** Team-proposed prototype theme, **not** an official Sime Darby Property corporate brand manual.

## 0. Branding reference and boundaries

Sime Darby Property's 2025 identity refresh retains its name, shield and heritage red, introducing red/yellow shades and an outward-moving mark. This design system **takes inspiration** from those visual cues rather than claiming official brand colors, font, or layout specifications.

- Official reference: https://www.simedarbyproperty.com/press-releases/sime-darby-property-launches-refreshed-brand-identity-anchored-purpose-and-legacy
- Hackathon reference: https://www.simedarbyproperty.com/universityhackathon/
- Use the official logo only from an approved asset provided for the hackathon. Do not recolor, distort, redraw, or imitate the corporate logo. The prototype's own product name must remain distinct.

## 1. Product UX principles

1. **One design language** across general dashboard, neighbourhood information, health/safety, and any later youth/elderly features.
2. **Accessible by default:** no text smaller than 14px for functional content; regular body 16px, primary tap targets at least 44×44px, keyboard focus, status labels alongside colors.
3. **Calm and scannable:** light neutrals, generous white space, clear headings, a single prominent primary action per section.
4. **Action-oriented:** every alert/card shows what it means and what can be done; do not make the UI a collection of charts without resident actions.
5. **Mobile-first:** preserve usability on a 360px wide phone; the desktop dashboard is a responsive enhancement.

## 2. Color tokens (TEAM-PROPOSED, NOT VERIFIED OFFICIAL HEX CODES)

| Token | Hex | Usage |
| --- | --- | --- |
| `--brand-primary` | `#D71920` | Main buttons, active states, key icons |
| `--brand-primary-hover` | `#A61219` | Button hover and pressed states |
| `--brand-orange` | `#F36B21` | Secondary decorative brand accent only |
| `--brand-amber` | `#FFB81C` | Reward graphics, badges, achievements (not small text on white) |
| `--page-bg` | `#F8F9FA` | Page background |
| `--surface` | `#FFFFFF` | Cards, dialogs, controls |
| `--text-primary` | `#1F2937` | Main content |
| `--text-secondary` | `#4B5563` | Supporting content |
| `--border` | `#E5E7EB` | Lines, inputs |
| `--success` | `#15803D` | Resolved, safe, completed |
| `--warning` | `#9A6700` | Caution text/icons |
| `--danger` | `#B91C1C` | Emergency, critical, destructive action |
| `--info` | `#1D4ED8` | Neutral informational system status |

Never convey hazard severity solely with color. Always include an icon and clear words: e.g. “High haze risk”, “Report in progress”. Red brand buttons and red hazard alerts have different purposes.

## 3. Typography

- Default font: **Inter** (fallback `system-ui, sans-serif`). This is our suggested UI font, **not** an asserted Sime Darby Property font.
- H1: `30px / 38px`, weight 700 (mobile `26px / 34px`).
- H2: `24px / 32px`, weight 700.
- H3 / card heading: `18px / 26px`, weight 600.
- Body: `16px / 24px`, weight 400.
- Label/button: `14px / 20px`, weight 600; buttons may use 16px if space allows.
- Supporting text: `14px / 21px`. Use `12px` only for genuinely nonessential metadata.
- Use sentence case for text and buttons; no ALL-CAPS paragraphs.
- Use accessible contrast; orange and yellow should not be body text on a white background.

## 4. Grid, spacing and shape

**Spacing scale:** 4, 8, 12, 16, 24, 32, 48px. Use these rather than random values.

| Element | Rule |
| --- | --- |
| Page content | max width `1200px`, centered |
| Desktop content padding | `32px` |
| Mobile content padding | `16px` |
| Desktop sidebar | `248px` wide, same on every page |
| Desktop top bar | `72px` high |
| Mobile bottom nav | 4 or 5 key destinations max; minimum 56px tall + safe area |
| Card | radius `16px`, padding `20–24px`, 1px border, subtle shadow |
| Button/input | radius `12px`, height `48px` (44px minimum) |
| Pills/tags | fully rounded; reserved for statuses/categories |
| Between related fields | `16px` |
| Between dashboard sections | `32px` |

Use a 12-column responsive grid on desktop, flexible stacks on mobile. Do not hard-code widths that overflow at 360px.

## 5. Standard components (do not independently redesign)

| Component | Required appearance/behavior |
| --- | --- |
| `AppShell` | shared page width, background, desktop sidebar, mobile navigation |
| `PageHeader` | heading, one-sentence subtitle, optional right-aligned CTA |
| `AppButton` | variants: `primary`, `secondary`, `ghost`, `danger`; loading and disabled states |
| `InfoCard` | white surface, 16px radius, border, heading, optional icon and action |
| `StatusBadge` | label + icon + semantic background; do not use color only |
| `AlertCard` | severity, timestamp, affected area and concrete action |
| `EventCard` | title, date/time, location, audience, join/view action |
| `ChallengeCard` | title, progress/steps, points/reward, join/complete action |
| `ReportCard` | tracking ID, issue, location, timestamp, reported/in progress/resolved |
| `FormField` | persistent visible label, helper text, error text, 48px field height |
| `EmptyState` | clear message and a next step; never blank content |
| `LoadingState` | consistent skeleton or spinner; layout must not jump |
| `Modal` | visible title and dismiss control; keyboard closable, focus handling |

**Shared states:** default, hover, active/focus, loading, empty, error, success and disabled. Status wording must be identical everywhere (e.g. `Reported`, `In Progress`, `Resolved`).

## 6. Navigation and page templates

**Prototype navigation:** Home, Community, Safety, Profile. Optional later destinations (e.g. My Activity) should reuse this shell.

**Shared Home:** welcome line → compact safety summary from teammate’s module → latest community notices from your module → upcoming events and volunteering CTA. Keep the full feature grids on their dedicated pages. Do not duplicate safety cards or community cards in separately built homepage implementations.

**Youth pages:** Community Challenges; Events; Volunteer Opportunities. Reuse the same shell and card components. Add playful progress visualization and amber reward accents, but do not introduce a separate font or a different navigation scheme.

**Elderly pages:** Help & Support; Community Activities; Safety Alerts. Reuse the same shell and components. Support an “Easy View” setting: body 18px+, increased button height, simplified text, clear action labels and fewer competing options. This is a *mode*, not an entirely different product design.

**Report-a-Facility flow:** Pick issue → add location/details → confirm submission → view status. Use the same status component in dashboard and detail views.

## 7. Responsive behavior

| Viewport | Layout |
| --- | --- |
| `<640px` | one-column layout, bottom navigation, 16px page padding |
| `640–1023px` | one/two-column cards, compact navigation |
| `≥1024px` | desktop sidebar + top bar; two/three-column card grid |

Tables become accessible vertical cards on mobile, or horizontally scrollable only when necessary. Forms normally stay one column on mobile.

## 8. Inclusive UX requirements

- Tap/click targets: `44×44px` minimum; action buttons target `48px` height.
- Visible keyboard focus with at least a 2px outline and offset.
- Informative icons must have text labels or accessible names.
- Every input needs a visible label and a descriptive error message.
- Statuses include text/icon, not just green/yellow/red dots.
- WCAG AA target: minimum 4.5:1 contrast for ordinary text; 3:1 for large text.
- Avoid moving carousels and critical information that auto-disappears.
- Offer Easy View for older residents; avoid clutter and jargon.
- Do not use brand orange/yellow as small text on white.

## 9. Engineering standard

**Single source of truth:** Import the same stylesheet or shared UI package into every page. Never copy/paste theme hex values into individual components.

Suggested React/Next.js structure:

```text
src/
  app/
    layout.tsx
    page.tsx
    community/
      page.tsx                  # YOUR module
    safety/
      page.tsx                  # TEAMMATE's module
    profile/
  components/
    ui/
      AppButton.tsx
      InfoCard.tsx
      StatusBadge.tsx
      FormField.tsx
    layout/
      AppShell.tsx
      Sidebar.tsx
      MobileNav.tsx
      PageHeader.tsx
    community/                 # YOUR feature components
      EventCard.tsx
      AnnouncementCard.tsx
      VolunteerCard.tsx
      TownshipUpdateCard.tsx
    safety/                    # TEAMMATE's feature components
      HazardSummaryCard.tsx
      WaterLevelCard.tsx
      TemperatureCard.tsx
      FacilityReportCard.tsx
  styles/
    design-tokens.css
  lib/
    navigation.ts
    status.ts
```

Use `npm`/`pnpm` consistently; choose one package manager and lockfile for the entire repo. Choose one icon set (e.g. `lucide-react`) and use its regular/outline style uniformly. If using Tailwind, map these exact tokens into your Tailwind theme once.

**Division of work (confirmed):** You own **Module 2 — Centralised Neighbourhood Information**. Your teammate owns **Module 1 — Health & Safety Hazards**. First merge the shared design tokens, application shell, navigation and base components. Each developer then builds only their owned feature directory and route, while the Home page composes components from both modules. Integrate early and compare screens at mobile and desktop widths. Additional youth/elderly experiences may be added later without changing this division.

## 10. Minimum prototype acceptance checklist

- [ ] All pages use the same red, type family and neutral background.
- [ ] Same header/sidebar/bottom nav, spacing and buttons.
- [ ] No random hex colors or inline per-page custom spacing.
- [ ] Test at 360px, 768px and 1440px viewport widths.
- [ ] Every view has empty/error/loading states where appropriate.
- [ ] Every user task has an obvious next action.
- [ ] Keyboard focus and legible text work.
- [ ] Easy View mode applies consistently (if implemented).
- [ ] Corporate logo (if shown) is correctly sourced and never modified.
- [ ] Both developers approve screenshots of the same shared components before building more pages.

**Recommended implementation sequence:** (1) tokens → (2) app shell → (3) UI components → (4) shared dashboard → (5) youth & elderly flows → (6) polish/demo.


## 11. Confirmed general dashboard ownership (October 2026)

| Responsibility | Module 1 — teammate | Module 2 — you |
| --- | --- | --- |
| Purpose | Help residents understand and respond to local risks | Help residents discover what is happening and get involved |
| Route | `/safety` | `/community` |
| Feature 1 | Haze / air-quality conditions (from an API, if feasible) | Community activities and upcoming events |
| Feature 2 | River/lake water level information (only with a verified data feed or clearly labelled demo data) | Facility maintenance announcements |
| Feature 3 | Temperature alerts | Community volunteering opportunities |
| Feature 4 | Damaged-facility reports with `Reported`, `In Progress`, `Resolved` | Important township updates |
| Main CTA | `View safety details` / `Report an issue` | `Explore events` / `Join volunteering` |
| Showcase | Safety cards + simple reports workflow | Announcements feed + event detail/registration demo |

**Important:** Both modules use the SAME `AppShell`, `PageHeader`, `InfoCard`, `StatusBadge`, `AppButton`, typography, spacing and navigation. They are **two sections of one general dashboard**, not separate website themes.

### Shared Home `/` integration contract

1. The **Home page** shows one safety summary from your teammate, plus your three latest community items, followed by two clear CTAs to `/safety` and `/community`.
2. Team members expose a compact reusable component: `SafetyOverview` (teammate) and `CommunityOverview` (you). Do not build separate navbars or full homepages.
3. Pass an optional `townshipId` (or use a single `DEMO_TOWNSHIP` constant) so all cards consistently refer to the same demo township.
4. Include `lastUpdated`, `sourceLabel`, and a visible `Demo data` indicator on simulated feeds. Do not present mock water levels or hazard readings as live observations.
5. For shared announcements involving hazard warnings, link to the safety module instead of implementing a second hazard system inside the community module.

### Your page: `/community` — layout

- **Page header:** `Neighbourhood Hub` with a one-line description and optional township selector (fixed demo township is acceptable).
- **Featured update:** newest/high-priority township notice, with date and source.
- **Quick-category row:** `Events`, `Maintenance`, `Volunteer`, `Township Updates`; clicking a category filters the visible cards.
- **Main content:** unified, reverse-chronological list of cards (default `All Updates`), plus an optional search box if time permits.
- **Event card:** name, time/date, location, short description, `View details` CTA.
- **Maintenance notice:** affected area, scheduled window, service impact, status (`Scheduled`, `In Progress`, `Completed`). This is **different from damaged-facility reports** in the safety module.
- **Volunteer card:** organisation/activity, date, location, available slots (only if known), `Join` CTA.
- **Township update:** official/general news, publication date, category, `Read more` CTA.
- **One meaningful demo interaction:** filter categories **and** view event details or join a volunteer activity in a modal (stateful, not a dead button).

### Teammate's page: `/safety` — layout

- **Page header:** `Health & Safety` with a short explanation and data recency/source.
- **Haze card:** AQI/API value and named risk level, location, timestamp and clear advisory.
- **Water-level card:** river/lake name, status and last-updated label; verified feed or demo data disclaimer.
- **Temperature card:** temperature and alert threshold/status, plus practical resident guidance.
- **Facilities feed:** issue, location, date and status (`Reported`, `In Progress`, `Resolved`).
- **One meaningful demo interaction:** submit a sample facility report and see it appear as `Reported`; allow changing report status in a demo/admin view if feasible.

## 12. Route ownership, data, and merge rules

**Routes are claimed before coding:**

```text
src/app/page.tsx                         shared Home integration (agree on one owner)
src/app/community/page.tsx               YOU
src/app/safety/page.tsx                  TEAMMATE
src/components/community/*              YOU
src/components/safety/*                 TEAMMATE
src/components/ui/*                     SHARED; change only after agreement
src/components/layout/*                 SHARED; change only after agreement
src/styles/design-tokens.css            SHARED; no per-page overrides of tokens
src/data/community.mock.ts              YOU
src/data/safety.mock.ts                 TEAMMATE
```

**Shared minimal data contract:**

```ts
type DemoMetadata = {
  id: string;
  townshipId: string;
  title: string;
  summary: string;
  updatedAt: string;       // ISO 8601
  sourceLabel: string;
  isDemoData: boolean;
};

type CommunityItem = DemoMetadata & {
  category: 'event' | 'maintenance' | 'volunteer' | 'township';
  startsAt?: string;       // for scheduled events and activities
  location?: string;
  status?: 'scheduled' | 'in_progress' | 'completed';
};

type FacilityReport = DemoMetadata & {
  status: 'reported' | 'in_progress' | 'resolved';
  location: string;
};
```

- Agree on the **same timezone**, same date format, and same township name before populating demo records. Display local Malaysian dates/times in the UI.
- Keep safety statuses separate from maintenance statuses; do not conflate `Scheduled` work with a `Reported` broken facility.
- Prefer **independent branches**: `feature/community-dashboard` for you, `feature/safety-dashboard` for teammate; pull requests into `main`.
- Build and merge the **shared shell first**. Neither developer independently edits the shell while implementing their modules.
- Do a side-by-side review at 360px, 768px and 1440px before demo day.

## 13. Hackathon-first implementation priority

**Must-have:** shared design foundation, one integrated Home, all 4 community sections as cards, all 4 safety sections as cards, clear timestamps/source labels, category filter on Community, facility issue submission/status flow on Safety, mobile responsiveness.

**Nice-to-have:** real public haze/temperature API, real event registration persistence, geolocation-filtered township data, push notifications, richer admin tooling. Only implement live water level/hazard feeds when trustworthy township-specific data is accessible.

**Do not overbuild:** there is no need for a full backend, actual SMS/push delivery, production authentication, or predictive AI merely to show a coherent hackathon demo. A clean, honest prototype with a complete resident journey is stronger than many nonfunctional features.
