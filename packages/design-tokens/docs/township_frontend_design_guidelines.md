# Help a Neighbour --- Shared Frontend Design System (v1.0)

**Project:** Sime Darby Property University Hackathon 2026\
**Design direction:** Modern, trusted, inclusive township living\
**Status:** Team-proposed prototype theme, **not** an official Sime
Darby Property corporate brand manual.

## 1. Branding reference and boundaries

Use Sime Darby Property's visual identity as inspiration, not as a claim
that these are its official design specifications. The proposed colors
below are prototype tokens and should be replaced if the hackathon
organizers provide official brand assets or guidelines.

-   Sime Darby Property: https://www.simedarbyproperty.com/
-   University Hackathon:
    https://www.simedarbyproperty.com/universityhackathon/

Use an approved corporate logo asset if required. Do not recolor,
distort, redraw, or imitate the corporate logo. Keep your own product
name distinct from the corporate identity.

## 2. Product UX principles

1.  **One design language** across general dashboard, youth engagement,
    and elderly support.
2.  **Accessible by default:** body text 16px, functional text generally
    no smaller than 14px, tap targets at least 44×44px, visible keyboard
    focus, and text labels alongside status colors.
3.  **Calm and scannable:** light neutrals, generous white space, clear
    headings, and one prominent primary action per section.
4.  **Action-oriented:** alerts and cards should explain what is
    happening and what the resident can do next.
5.  **Mobile-first:** preserve usability on a 360px-wide phone; desktop
    layouts are responsive enhancements.

## 3. Color tokens

**These are team-proposed HEX values, not verified official Sime Darby
Property brand codes.**

  -------------------------------------------------------------------------
  Token                     Hex                     Usage
  ------------------------- ----------------------- -----------------------
  `--brand-primary`         `#D71920`               Main buttons, active
                                                    states, key icons

  `--brand-primary-hover`   `#A61219`               Button hover and
                                                    pressed states

  `--brand-orange`          `#F36B21`               Decorative brand accent

  `--brand-amber`           `#FFB81C`               Rewards, achievements,
                                                    challenge accents

  `--page-bg`               `#F8F9FA`               Page background

  `--surface`               `#FFFFFF`               Cards, dialogs,
                                                    controls

  `--text-primary`          `#1F2937`               Main content

  `--text-secondary`        `#4B5563`               Supporting content

  `--border`                `#E5E7EB`               Lines, inputs

  `--success`               `#15803D`               Resolved, safe,
                                                    completed

  `--warning-ink`           `var(--text-primary)`   Caution text, always dark

  `--warning-fill`          `#F59E0B`               Caution icon, dot, bar
                                                    and fill only, never text

  `--warning-tint`          `#FEF3C7`               Caution badge and card
                                                    background

  `--danger`                `#B91C1C`               Critical, destructive
                                                    action

  `--info`                  `#1D4ED8`               Informational status
  -------------------------------------------------------------------------

Do not convey hazard severity using color alone. Include an icon and
clear words, such as "High haze risk" or "Report in progress." Brand red
and safety red should have distinct contextual labels.

## 4. Typography

-   Suggested UI font: **Inter**, with fallback `system-ui, sans-serif`.
    This is a project recommendation, not an asserted corporate font.
-   H1: `30px / 38px`, weight 700 (mobile `26px / 34px`).
-   H2: `24px / 32px`, weight 700.
-   H3/card heading: `18px / 26px`, weight 600.
-   Body: `16px / 24px`, weight 400.
-   Labels/buttons: `14–16px / 20px`, weight 600.
-   Supporting text: `14px / 21px`; reserve `12px` for nonessential
    metadata.
-   Use sentence case. Avoid all-caps paragraphs.
-   Do not use orange or yellow for small text on white backgrounds.

## 5. Grid, spacing, and shape

**Spacing scale:** 4, 8, 12, 16, 24, 32, 48px. Use these rather than
arbitrary values.

  -----------------------------------------------------------------------
  Element                             Rule
  ----------------------------------- -----------------------------------
  Page content                        Max width `1200px`, centered

  Desktop content padding             `32px`

  Mobile content padding              `16px`

  Desktop sidebar                     `248px` wide

  Desktop top bar                     `72px` high

  Mobile bottom navigation            4--5 destinations maximum; at least
                                      56px high plus safe area

  Card                                `16px` radius, `20–24px` padding,
                                      1px border, subtle shadow

  Button/input                        `48px` height (44px minimum),
                                      `12px` radius

  Status pills                        Fully rounded

  Related fields                      `16px` apart

  Dashboard sections                  `32px` apart
  -----------------------------------------------------------------------

Use a 12-column responsive grid on desktop and flexible stacks on
mobile. Avoid fixed widths that overflow at 360px.

## 6. Standard shared components

Do not independently redesign these on each page.

  -----------------------------------------------------------------------
  Component                           Required appearance/behavior
  ----------------------------------- -----------------------------------
  `AppShell`                          Shared page width, background,
                                      desktop sidebar, mobile navigation

  `PageHeader`                        Heading, short subtitle, optional
                                      CTA

  `AppButton`                         `primary`, `secondary`, `ghost`,
                                      `danger` variants; loading and
                                      disabled states

  `InfoCard`                          White surface, 16px radius, border,
                                      heading, optional icon/action

  `StatusBadge`                       Text + icon + semantic background;
                                      never color only

  `AlertCard`                         Severity, timestamp, affected area,
                                      clear action

  `EventCard`                         Title, date/time, location,
                                      audience, join/view action

  `ChallengeCard`                     Title, progress, reward,
                                      join/complete action

  `ReportCard`                        Tracking ID, issue, location,
                                      timestamp, status

  `FormField`                         Persistent visible label,
                                      helper/error text, 48px field
                                      height

  `EmptyState`                        Clear message and next step

  `LoadingState`                      Consistent skeleton/spinner without
                                      major layout shifts

  `Modal`                             Visible title and dismiss control;
                                      keyboard support and focus handling
  -----------------------------------------------------------------------

Shared status labels should be identical everywhere, e.g. `Reported`,
`In Progress`, and `Resolved`.

## 7. Navigation and page templates

**Suggested global destinations:** Home, Community, Safety, My Activity,
Profile. For the prototype, show fewer destinations if only a few user
journeys are implemented.

**Shared home page:** welcome line → high-priority alerts → quick
actions → upcoming events → relevant activity/support cards.

**Youth pages:** Community Challenges, Events, Volunteer Opportunities.
Reuse the same shell and card components. Progress visuals and amber
reward accents are fine; do not introduce a separate font or navigation
system.

**Elderly pages:** Help & Support, Community Activities, Safety Alerts.
Reuse the same shell and components. Provide an optional **Easy View**
setting with 18px+ body text, larger buttons, simplified wording, and
fewer competing choices. This is a mode, not a separate product design.

**Report-a-Facility flow:** Choose issue → add location/details →
confirm submission → track status. Reuse the same status component in
the dashboard and detail view.

## 8. Responsive behavior

  Viewport       Layout
  -------------- -------------------------------------------------------
  `<640px`       One column, bottom navigation, 16px page padding
  `640–1023px`   One/two-column cards, compact navigation
  `≥1024px`      Desktop sidebar + top bar; two/three-column card grid

Convert tables to accessible vertical cards on mobile, or allow
horizontal scrolling only when necessary. Forms should normally be one
column on mobile.

## 9. Inclusive UX requirements

-   Tap/click targets: minimum `44×44px`; action buttons should target
    `48px` height.
-   Visible keyboard focus with at least a 2px outline and offset.
-   Informative icons need text labels or accessible names.
-   Every input needs a visible label and descriptive error message.
-   Statuses include text/icon, not just colored dots.
-   WCAG AA target: 4.5:1 contrast for ordinary text; 3:1 for large
    text.
-   Avoid auto-advancing carousels and critical information that
    disappears too quickly.
-   Offer Easy View for older residents; avoid clutter and jargon.
-   Do not use brand orange/yellow as small text on white.

## 10. Engineering standard

**Single source of truth:** import the same stylesheet or shared UI
package into every page. Never copy/paste theme hex values into
individual components.

Suggested React/Next.js structure:

``` text
src/
  app/
    layout.tsx
    page.tsx
    community/
    safety/
    activities/
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
    features/
      AlertCard.tsx
      EventCard.tsx
      ChallengeCard.tsx
  styles/
    design-tokens.css
  lib/
    navigation.ts
    status.ts
```

-   Pick one package manager and commit only its lockfile.
-   Choose one icon set (e.g. `lucide-react`) and use it consistently.
-   If using Tailwind, map these exact tokens into the Tailwind theme
    once.

**Suggested division of work:** first merge the tokens, shell,
navigation, and base components. Then Developer A builds youth workflows
while Developer B builds elderly/support workflows, both importing the
same components. Integrate early and compare mobile and desktop screens
side by side.

## 11. Minimum prototype acceptance checklist

-   [ ] All pages use the same primary red, font family, and neutral
    background.
-   [ ] Same header/sidebar/bottom navigation, spacing, and button
    styles.
-   [ ] No random hex colors or per-page custom spacing.
-   [ ] Test at 360px, 768px, and 1440px viewport widths.
-   [ ] Every view has appropriate empty/error/loading states.
-   [ ] Every user task has an obvious next action.
-   [ ] Keyboard focus and legible text work.
-   [ ] Easy View mode applies consistently, if implemented.
-   [ ] Corporate logo, if shown, is correctly sourced and never
    modified.
-   [ ] Both developers approve screenshots of shared components before
    building more pages.

**Recommended implementation sequence:** (1) tokens → (2) app shell →
(3) UI components → (4) shared dashboard → (5) youth and elderly flows →
(6) polish/demo.
