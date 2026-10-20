# Volunteer Nearby integration

The final scope and architecture are documented in [YOUNG_MATCHING.md](YOUNG_MATCHING.md): elderly requests only, 240-character explanations, no Community-page AI.

## Required integration files

Include matching service/validator/request-ranking modules, opportunity routing and service, contracts, Young cards/feed/accepted-task UI, Community joined-activity tracking, matching Lambda routing, focused tests and offline benchmark tools. Required saved fixtures are under `apps/api/scripts/matching-benchmark/results`: historical benchmark captures, the three Young-role input/response sessions, and the latest 240-character regression response. Tests must not depend on ignored cache files.

Exclude `.env`, credentials, dependencies, local replay scripts/output and unused elderly suggestion components. Historical fictional benchmark audit markers are retained with their reports for request-count traceability; they are not executable credentials.

## Integration checks

Use `pnpm.cmd check` for workspace typechecks, lint, formatting, builds and tests. Tests use injected responses and isolated local DynamoDB tables. No live provider calls are required. Integration must include current main and pass CI before merge.

The user has manually approved the mobile appearance. Automated DOM tests verify labels, expanded text, sorting and acceptance; no agent browser measurement is claimed. Recheck at 360 px on the final built branch, including long explanations, Show more, keyboard focus, larger text and bottom navigation.

Hosted routing and live configuration require separate deployment approval. No hosted readiness or fresh model quality benchmark is claimed.
