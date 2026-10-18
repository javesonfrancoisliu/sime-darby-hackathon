# Requirements Document

## Introduction

This document defines the requirements for the elderly-facing frontend of "Help a Neighbour", a mobile-first web application built by Team Capybara for the Sime Darby Property University Hackathon 2026. The application connects elderly residents with nearby young volunteers for short, practical help such as grocery runs, transport, and learning new technology.

This feature covers only the experience for elderly users. A separate frontend for young volunteers is handled by another team member. The elderly frontend prioritises accessibility for older and less tech-savvy users: large text, high contrast, simple navigation, and a small number of clear choices per screen. The application is a React frontend placed under `apps/elderly-web/`, calls the backend API over relative `/api/...` paths, imports shared types from `@sdh/contracts`, and follows Sime Darby Property branding.

The elderly user can request help in one of three categories (groceries, transport, technology learning), view the status of each request, and see the volunteer matched to a request once a match is made. Backend endpoints and contract schemas referenced here are assumed to be provided by the API team; this feature consumes them.

## Glossary

- **Elderly_Frontend**: The React web application in `apps/elderly-web/` that serves elderly users.
- **Elderly_User**: A resident who uses the Elderly_Frontend to request help. The intended audience is older and less tech-savvy people.
- **Volunteer**: A young person who fulfils help requests. Managed by a separate frontend; referenced here only as the counterpart matched to a request.
- **Help_Request**: A record created by an Elderly_User describing a single piece of help needed, belonging to one Help_Category.
- **Help_Category**: One of exactly three values: `groceries`, `transport`, `technology_learning`.
- **Request_Status**: The lifecycle state of a Help_Request, one of: `pending`, `matched`, `in_progress`, `completed`, `cancelled`.
- **API**: The backend service reachable from the Elderly_Frontend over relative paths beginning with `/api/`.
- **Error_Response**: The API error shape `{ "error": { "code": string, "message": string } }`.
- **Contracts_Package**: The shared schema package imported as `@sdh/contracts`.
- **Accessibility_Baseline**: Body text rendered at a minimum of 18px, interactive targets at a minimum of 44x44 CSS pixels, and a text contrast ratio of at least 4.5:1 against the background.
- **Sime_Darby_Theme**: The visual theme following Sime Darby Property branding (brand colours, logo, typography).

## Requirements

### Requirement 1: Accessible presentation baseline

**User Story:** As an elderly user, I want large, high-contrast, clearly laid out screens, so that I can read and operate the application without strain.

#### Acceptance Criteria

1. THE Elderly_Frontend SHALL render body text at a font size of at least 18 CSS pixels.
2. THE Elderly_Frontend SHALL render all interactive controls with a touch target of at least 44 by 44 CSS pixels.
3. THE Elderly_Frontend SHALL present text with a contrast ratio of at least 4.5:1 against its background.
4. THE Elderly_Frontend SHALL display at most one primary task per screen.
5. WHERE a control performs an action, THE Elderly_Frontend SHALL label the control with descriptive text rather than an icon alone.
6. THE Elderly_Frontend SHALL associate every form input with a visible text label.

### Requirement 2: Mobile-first responsive layout

**User Story:** As an elderly user, I want the application to work on my phone, so that I can request help from anywhere.

#### Acceptance Criteria

1. THE Elderly_Frontend SHALL render a single-column layout at viewport widths of 360 CSS pixels and above.
2. THE Elderly_Frontend SHALL present content without horizontal scrolling at viewport widths between 360 and 768 CSS pixels.
3. WHILE the viewport width is 768 CSS pixels or greater, THE Elderly_Frontend SHALL constrain primary content to a maximum readable width and centre the primary content.

### Requirement 3: Sime Darby branding

**User Story:** As a hackathon participant, I want the elderly frontend to follow Sime Darby Property branding, so that the application matches the sponsor identity.

#### Acceptance Criteria

1. THE Elderly_Frontend SHALL apply the Sime_Darby_Theme to all screens.
2. THE Elderly_Frontend SHALL display the Sime Darby Property name or logo on the home screen.
3. THE Elderly_Frontend SHALL use Sime_Darby_Theme colours that satisfy the contrast requirement defined in Requirement 1.

### Requirement 4: Simple navigation

**User Story:** As an elderly user, I want simple and predictable navigation, so that I do not get lost in the application.

#### Acceptance Criteria

1. THE Elderly_Frontend SHALL present a home screen offering the actions "Request help" and "View my requests".
2. WHEN an Elderly_User is on any screen other than the home screen, THE Elderly_Frontend SHALL display a back control that returns to the previous screen.
3. WHEN an Elderly_User activates the back control, THE Elderly_Frontend SHALL return to the previously displayed screen.
4. THE Elderly_Frontend SHALL limit the primary navigation to at most three top-level destinations.

### Requirement 5: Create a help request

**User Story:** As an elderly user, I want to request help in a chosen category, so that a volunteer can assist me.

#### Acceptance Criteria

1. THE Elderly_Frontend SHALL present exactly three Help_Category choices: groceries, transport, and technology learning.
2. WHEN an Elderly_User selects a Help_Category, THE Elderly_Frontend SHALL display a form to enter a description of the help needed.
3. WHEN an Elderly_User submits a Help_Request with a non-empty description, THE Elderly_Frontend SHALL send the Help_Request to the API using types from the Contracts_Package.
4. WHEN the API confirms creation of a Help_Request, THE Elderly_Frontend SHALL display a confirmation screen showing the submitted Help_Category and description.
5. IF an Elderly_User attempts to submit a Help_Request with an empty description, THEN THE Elderly_Frontend SHALL display a message prompting the Elderly_User to enter a description and SHALL withhold the request from the API.
6. IF the API returns an Error_Response when creating a Help_Request, THEN THE Elderly_Frontend SHALL display the message from the Error_Response and SHALL offer a control to retry submission.

### Requirement 6: View request status

**User Story:** As an elderly user, I want to see the status of my requests, so that I know whether help is on the way.

#### Acceptance Criteria

1. WHEN an Elderly_User opens the "View my requests" screen, THE Elderly_Frontend SHALL request the Elderly_User's Help_Requests from the API.
2. WHEN the API returns a list of Help_Requests, THE Elderly_Frontend SHALL display each Help_Request with its Help_Category, description, and Request_Status.
3. THE Elderly_Frontend SHALL render each Request_Status value as human-readable text.
4. IF the API returns an empty list of Help_Requests, THEN THE Elderly_Frontend SHALL display a message indicating that no requests exist and SHALL offer a control to create a Help_Request.
5. IF the API returns an Error_Response when listing Help_Requests, THEN THE Elderly_Frontend SHALL display the message from the Error_Response and SHALL offer a control to retry the request.
6. WHILE the API request for Help_Requests is in progress, THE Elderly_Frontend SHALL display a loading indicator.

### Requirement 7: View matched volunteer

**User Story:** As an elderly user, I want to see who is helping me once a volunteer is matched, so that I know who to expect.

#### Acceptance Criteria

1. WHEN a Help_Request has a Request_Status of matched, in_progress, or completed, THE Elderly_Frontend SHALL display the matched Volunteer's name for that Help_Request.
2. WHILE a Help_Request has a Request_Status of pending, THE Elderly_Frontend SHALL display text indicating that the Elderly_User is waiting to be matched.
3. WHEN an Elderly_User selects a Help_Request, THE Elderly_Frontend SHALL display a detail screen showing the Help_Category, description, Request_Status, and matched Volunteer's name when a Volunteer is matched.

### Requirement 8: Cancel a pending request

**User Story:** As an elderly user, I want to cancel a request I no longer need, so that no volunteer is sent unnecessarily.

#### Acceptance Criteria

1. WHILE a Help_Request has a Request_Status of pending, THE Elderly_Frontend SHALL display a control to cancel that Help_Request.
2. WHEN an Elderly_User activates the cancel control, THE Elderly_Frontend SHALL request confirmation before sending the cancellation to the API.
3. WHEN an Elderly_User confirms a cancellation, THE Elderly_Frontend SHALL send the cancellation to the API and SHALL update the displayed Request_Status to cancelled upon API confirmation.
4. IF the API returns an Error_Response when cancelling a Help_Request, THEN THE Elderly_Frontend SHALL display the message from the Error_Response and SHALL retain the Help_Request's prior Request_Status.

### Requirement 9: API communication conventions

**User Story:** As a frontend developer, I want the elderly frontend to follow the project's API conventions, so that it integrates cleanly with the shared backend and contracts.

#### Acceptance Criteria

1. THE Elderly_Frontend SHALL call the API using relative paths that begin with `/api/`.
2. THE Elderly_Frontend SHALL use request and response types imported from the Contracts_Package.
3. WHILE running in local development, THE Elderly_Frontend SHALL proxy requests beginning with `/api` to `http://127.0.0.1:3001`.
4. IF an API call fails without returning a structured Error_Response, THEN THE Elderly_Frontend SHALL display a generic failure message and SHALL offer a control to retry.
