# Matching demo

See [YOUNG_MATCHING.md](YOUNG_MATCHING.md) for the final elderly-request-only scope and 240-character explanation contract.

## Rules-only local demo

1. Start DynamoDB Local with `pnpm.cmd db:up` and initialize/seed it if needed using the repository README. Reuse existing servers to avoid occupied ports.
2. Start `pnpm.cmd dev`. Keep `apps/api/.env` model setting blank.
3. Open `http://localhost:5175`. As an elderly fictional user create a future help request; as a verified Young volunteer open Volunteer Nearby.
4. Inspect personalized percentages and expandable rule explanations. Change volunteer profile to see different suitability. Test Best Match, Nearest, Soonest and Most Urgent.
5. Accept a request and inspect My accepted tasks and the elderly user's request status. Community activities remain in Community, including attendance completion.
6. At 360 px check wrapping, no horizontal scroll, explanation expansion, source labels, Show more for longer AI text, and reachable action buttons.

## Offline genuine-response replay

Run `pnpm.cmd --filter @sdh/api test scripts/matching-benchmark/young-explanations.test.ts scripts/matching-benchmark/replay.test.ts` and `pnpm.cmd --filter @sdh/web test src/app/volunteer/VolunteerPage.liveReplay.test.tsx src/components/volunteer/OpportunityCard.sources.test.tsx`.

These replay saved provider text through validation and rendered components without inference. Original 154/143-character reasons are preserved unchanged under the new limit. Historical responses remain third person; future prompts request second person. Local response overrides/replay servers are inspection aids only and must be stopped before testing acceptance/freshness. They are excluded from Git.

## Controlled live inference

Separate explicit approval is required for each attempt. The existing `controlled-young-demo.ts` runner uses production matching, an exclusive reservation and a one-request transport budget with no retries. It requires local DynamoDB/demo auth and the existing `sdh-dev`/Parameter Store configuration. Persistent model configuration remains blank. Do not run it as part of CI or ordinary development.

Stop any local replay, stop only the normal API owning port 3001, and follow [LIVE_YOUNG_TEST_READINESS.md](LIVE_YOUNG_TEST_READINESS.md). Save usage, latency, raw response and validated feed without secrets. Stop the guarded process and restart the normal rules-only API after inspection. No additional approval is inferred from earlier consumed attempts.
