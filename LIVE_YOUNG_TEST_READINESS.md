# Controlled live Young matching test

Current scope: elderly requests only in Volunteer Nearby, personalized to the authenticated volunteer. The explanation limit is 240 characters, with a 110-170 target in second person. See [YOUNG_MATCHING.md](YOUNG_MATCHING.md).

Earlier approvals have been consumed. **Do not run live inference without fresh explicit approval.** Ordinary development and CI stay rules-only or use injected saved responses.

## Before an approved attempt

- Keep persistent `MATCHING_AI_MODEL_ID=` blank. Existing `sdh-dev` credentials, `AWS_REGION=ap-southeast-5` and `ANTHROPIC_API_KEY_PARAM=/sime-darby-hackathon/dev/anthropic-api-key` are reused server-side. Never display or commit the decrypted key.
- Run DynamoDB Local and the existing frontend servers. No cloud deployment is needed for the local pipeline.
- Stop any saved-response replay. In rules mode, select an existing fictional verified volunteer and at least two eligible future elderly requests with different relevance/distance/schedule evidence. Record scores and baseline order.
- Obtain explicit approval for one attempt, no retries. Stop only the normal API on port 3001; avoid duplicate frontend servers.

## Guarded command after approval only

From the repository root, provide a unique audit ID for this separately authorized attempt:

```powershell
pnpm.cmd --filter @sdh/api exec tsx --env-file-if-exists=.env scripts/controlled-young-demo.ts --approved-one-young-e2e APPROVAL-ID
```

Replace `APPROVAL-ID` with a unique lowercase letters/numbers/hyphens identifier. The runner refuses reused reservations. Never delete a marker to retry. It requires local demo authentication/DynamoDB and the existing secure AWS configuration.

The runner uses production dispatch, request ranking, prompt, SSM key retrieval, validation and cache. It permits at most one official Messages POST, reserves the attempt before transport, disables retries and blocks further attempts/redirects. It enables the model only in that process. Failures and timeouts consume the attempt, even if usage is unknown. Community activities do not enter the feed or model shortlist.

Open the app as the selected volunteer once. Capture the raw audit and validated feed. Verify AI-assisted ranking, independent Claude/fallback explanation labels, unchanged numeric percentages, Best Match server order and factual concise text. Identical order is a valid result; do not force reranking or retry. Refreshes, profile/filter changes or acceptance can invalidate the cache; the guard must block additional paid transport. This is not an unrestricted demo mode.

## Restore and report

Stop the guarded process and restart the normal API:

```powershell
pnpm.cmd --filter @sdh/api dev
```

Confirm the persistent model setting remains blank. Report request attempts, actual tokens, latency, estimated cost using the applicable provider rates, raw output, validation changes and fallback. Unknown usage is not zero. Audit files under `apps/api/node_modules/.cache` remain local and must be reviewed/redacted before selectively retaining fictional regression evidence.

For manual mobile inspection use localhost:5175 and a 360 px viewport. Check wrapping, larger text, explanation expansion/Show more, source badges, keyboard focus and action accessibility. Saved replay is for visual inspection only; disable it before testing acceptance or freshness. A physical phone needs separate LAN/HTTPS setup.

Hosted demonstration requires separately approved deployment of the matching handler/frontend and the explicit GET /api/opportunities route/invoke permission. Local tests do not verify deployed AWS routing or credentials. Original 15-scenario results measure the historical volunteer-for-request direction, not Young request ranking.
