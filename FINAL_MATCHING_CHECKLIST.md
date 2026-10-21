# Matching integration checklist

- Final feed: elderly assistance requests only; Community activities and completion remain on Community.
- Personalized rule percentages remain 50/30/20; Claude only supplies ordering and explanations.
- Shared explanation limit 240; second-person prompt target 110-170; safe shortening and grounding checks remain.
- Ranking and explanation-source labels are independent; Show more keeps long explanations compact and accessible.
- Focused offline replay, source/score/sorting/acceptance and elderly tracking tests pass. Full workspace integration checks must pass before push/merge.
- User manually approved mobile appearance; no agent browser geometry measurement is claimed.
- Credentials, `.env`, local cache and replay are excluded. Live model configuration remains disabled.
- Hosted matching Lambda bundle, API route/permission and frontend deployment require separate approval; no AWS changes are performed locally.
- Preserve original benchmark reports. They measure the historical volunteer-for-request direction, not current Young request ranking.

See [YOUNG_MATCHING.md](YOUNG_MATCHING.md) and [MATCHING_DEMO.md](MATCHING_DEMO.md).
