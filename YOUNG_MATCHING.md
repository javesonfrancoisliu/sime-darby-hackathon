# Personalized volunteer matching

Young -> Volunteer Nearby displays **elderly assistance requests only**. Community events and volunteer drives remain in Community's Events and Volunteer tabs, including joined-activity completion tracking. No AI feature is added to `/community`.

## Matching workflow

1. Elderly residents create and track requests through the existing flow.
2. `GET /api/opportunities` resolves the authenticated, verified volunteer. It selects open future requests using existing radius/category/date/schedule filters.
3. The shared scorer calculates suitability: 50% skills (including existing experience relevance), 30% approximate proximity, 20% saved availability. These are suitability percentages, not probabilities. Missing availability is unknown.
4. Up to ten baseline-shortlisted requests enter the shared Claude integration with one anonymous volunteer profile. Existing SSM key retrieval, timeout, disabled retries, validation, per-volunteer cache and rule fallback are reused. No model-generated score is accepted.
5. Best Match follows server rank. Nearest, Date (Soonest) and Most Urgent remain independent. Accept & help uses the existing authenticated request acceptance endpoint; the elder can track the updated status. Completion, points and experience levels remain unchanged.

## Explanations and provenance

The shared hard limit is **240 characters**. The Young prompt targets **110-170 characters**, one or two concise sentences addressed directly to the volunteer (you/your). Valid saved Claude text is preserved verbatim; older raw responses can therefore still be third person. The locally edited second-person replay is an ignored inspection aid, not a new Claude response or production normalization feature.

Longer explanations undergo safe deterministic local shortening, then factual validation. Unsupported qualifications/history/skills and incorrect availability claims trigger factual rule fallback. Heuristic validation is conservative, not a semantic proof.

`matchSource` identifies ranking (`ai`/`rules`); `explanationSource` separately identifies explanation provenance. The UI shows AI-assisted for AI ranking, Claude explanation for retained AI text, Rule-based explanation (fallback) for repaired text, and Personalized rules for normal rules-only results. Explanations over 170 characters have a three-line preview and accessible Show more/Show less controls. Full validated text remains available.

## Compatibility and evaluation

The owner/coordinator-authorized `/api/requests/{id}/matches` endpoint remains for compatibility and historical evaluation. It ranks volunteers for a request; it is not the primary Young workflow, and elderly pages do not invoke it for suggestions.

The original 15-case benchmark ranked volunteers, not requests. Its measured NDCG is not evidence of current request-ranking quality. Original reports/raw captures remain immutable. Offline replay verifies historical input hashes against captured prompts and unchanged dataset payloads, then checks current explanation handling and unchanged ranking/scores. A request-ranking benchmark is future work requiring separate approval for live inference.

## Deployment

Local dispatch serves both core and matching routes. Hosted deployment must ship matching/frontend bundles, route `GET /api/opportunities` to the existing matching Lambda, and apply its narrow invocation permission. Existing SSM access remains server-side. Terraform changes are source only; deployment/cloud state is unverified. No database migration or new key is needed.

Keep persistent `MATCHING_AI_MODEL_ID=` blank until separately approved. Existing `sdh-dev` credentials and Parameter Store configuration are reused by approved live tests only. Warm-process caching is not a spending cap.
