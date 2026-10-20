# Explanation limit update ? offline only

- Shared `MAX_REASON_LENGTH` is 240. Match responses, opportunity reasons, local validation, and frontend rule explanation assembly use this limit.
- Young matching prompt targets 110?170 characters, one or two sentences, addressed directly to the volunteer. Saved third-person responses are preserved verbatim rather than rewritten as new Claude text.
- Safe shortening remains for text above 240; unsupported credentials, history, skill assertions and availability still trigger rules. AI ranking and explanation provenance remain independent.
- Claude explanations over 170 characters have a three-line visual preview and a keyboard accessible Show more/Show less button. Full text remains in the DOM. Existing wrapping and narrow-card spacing remain.
- Offline regression replays preserve the earlier 154/143-character responses and both responses from the latest approved call. The old benchmark reports and raw captures are unchanged. Replay checks historical hashes against captured input and checks the dataset payload against current data, allowing a versioned prompt change.
- Scoring, eligibility, ordering, sorting and acceptance are unchanged. No live inference, AWS writes, commits, pushes or deployment.

For manual inspection: use Justina Tan in the local saved-response replay, open Volunteer Nearby at 360 px, expand both match badges, and check Claude explanation labels, wrapping and the unchanged 47%/44% scores. The historical wording remains third-person. To inspect the >170-character preview use the focused UI test fixture. Actual browser visual verification was unavailable in this environment.
