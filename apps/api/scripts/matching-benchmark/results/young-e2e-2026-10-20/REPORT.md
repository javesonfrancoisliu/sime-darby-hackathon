# One controlled Young-role Claude test

20 October 2026. One explicitly approved inference attempt succeeded through the
normal HTTP opportunity endpoint, authenticated demo identity, production request
matcher/prompt, existing SSM helper and installed Anthropic SDK. No retries,
benchmark reruns, AWS resource changes, deployment, commits or pushes occurred.

## Actual results

| Measure                            | Observed                                                |
| ---------------------------------- | ------------------------------------------------------- |
| Model                              | `claude-haiku-5-5`                                      |
| Inference attempts / retries       | 1 / 0                                                   |
| Provider / opportunity HTTP status | 200 / 200                                               |
| Input / output tokens              | 1,318 / 208                                             |
| Total tokens                       | 1,526                                                   |
| Cache read / creation tokens       | 0 / 0                                                   |
| Estimated inference cost           | USD 0.0002358                                           |
| Model HTTP transport latency       | 2,119 ms                                                |
| Complete opportunity HTTP response | 2,788 ms                                                |
| Structured ranking                 | Valid: c1, c2, c3, all known and unique                 |
| Request ranking fallback           | None                                                    |
| Explanation repair                 | One overlong sentence replaced by factual rule evidence |
| Final explanations                 | All within 140 characters                               |

Cost uses USD 0.10 per million input tokens and USD 0.50 per million output tokens
for this short prompt, based on [official pricing](https://platform.claude.com/docs/en/models/haiku-5-5/overview).
It is an estimate, not an invoice, and excludes any existing AWS account charges.
Model latency excludes the earlier SSM/key retrieval; end-to-end feed latency
includes local API work and key retrieval.

## Selected profile and evidence

Justina Tan is the existing verified fictional grocery volunteer. Her other listed
skills are transport, digital help and community activities; her experience says
she helps her grandparents with phones and errands weekly. Her saved availability
is 08:00–21:00 daily, covering all three requests. No new profile or request was
required, and the app was not supplied any fabricated score or model response.

| Request                     | Distance | Before / after score | Request order | Final explanation                                                 |
| --------------------------- | -------- | -------------------- | ------------- | ----------------------------------------------------------------- |
| Ride to the health clinic   | 2 km     | 88 / 88              | 1 / 1         | Genuine Claude text, unchanged, 138 characters                    |
| Explain a health leaflet    | 0.5 km   | 47 / 47              | 2 / 2         | Rule evidence, 50 characters, replacing 143-character Claude text |
| Change a ceiling light bulb | 1 km     | 44 / 44              | 3 / 3         | Genuine Claude text, unchanged, 124 characters                    |

The production mixed feed contains five rule-based community events before these
requests; global ranks remain 6, 7 and 8. Claude agreed with baseline order. This
checks integration, not improvement or measured ranking quality. Original benchmark
reports remain unchanged; this was not a 15-scenario run.

The unchanged percentages are consistent with the existing score components:
clinic 50 skill + 18 proximity + 20 saved schedule = 88; leaflet 0 + 27 + 20 = 47;
light bulb 0 + 24 + 20 = 44. None of these values comes from Claude.

Clinic explanation:

> She has transport and community-activities skills and helps her grandparents with errands weekly, so this 2 km clinic ride suits her well.

Light-bulb explanation:

> Her listed skills do not include home repairs and no ladder experience is stated, so this ceiling bulb task is a weaker fit.

These statements match the supplied profile, coarse distances and request text.
No driving licence, professional qualification or unlisted experience was invented.
The light-bulb text correctly says ladder experience is not stated, rather than
claiming the volunteer has never used a ladder.

The leaflet sentence was 143 characters. The existing validator refused to cut
off a sentence containing a qualification and used this factual fallback:

> About 0.5 km away; Free on Thursday 08:00 to 21:00

Its availability matches the saved slot, rather than a guarantee of attendance.
The `AI-assisted` indicator denotes genuine validated AI ranking; it does not
guarantee that every displayed explanation survived validation unchanged. This
one case is explicitly recorded in `report.json` and `raw-response.json`.

## Frontend and acceptance verification

`apps/web/src/app/volunteer/VolunteerPage.liveReplay.test.tsx` renders the genuine
saved HTTP response through the actual Young-role page, data mapping and components.
Only local HTTP responses are replayed; it does not call Claude or replace model
output with invented prose. The test verifies all three AI-assisted labels, exact
validated explanations and percentage buttons, request order, independent sorts,
expanded explanations and the Accept & help control. Saved test time is fixed so
the dated evidence does not change urgency behaviour in future reruns.

Post-test checks passed: 20 focused Young-role tests (including this genuine-output
replay), API and Young-role TypeScript checks, scoped lint and formatting. Before
execution, all four installed-SDK/one-attempt transport guard tests also passed.

There was no connected browser surface. Actual pixels, overflow at 360 px and a
live browser screenshot of this result were not observed. Earlier manual mobile
review was rules-only; do not describe this DOM replay as a visual live-browser test.

After stopping the guarded API and restoring normal rules mode, the selected
clinic request was accepted through the existing real local API as Justina. The
resident's request returned matched status and Justina's volunteer ID; the request
disappeared from the open feed. Both HTTP operations returned 200. No task was
marked completed or awarded points. This leaves a deliberate local demo-data
change: the clinic request is now accepted. No request status was silently reset.

## Restoration and demo readiness

The guarded process was stopped. Normal API and three Vite frontends are running;
`MATCHING_AI_MODEL_ID=` remains blank in the persistent `.env`. A fresh normal feed
was confirmed entirely rules-based. The exclusive reservation/attempt markers
remain under `apps/api/node_modules/.cache` and must not be deleted to retry.

The integration is ready for a local hackathon demo, subject to a final visual
check of genuine output on the user's browser and separate authorization for any
future live inference. The app currently demonstrates rules only; no automatic
live AI calls remain enabled. Existing upcoming requests can be shown normally;
the accepted clinic ride appears under accepted tasks and resident tracking.

To inspect the genuine AI result without spending again, open the saved input,
raw response, hybrid feed and report here, or run this offline frontend check:

```powershell
pnpm.cmd --filter @sdh/web exec vitest run src/app/volunteer/VolunteerPage.liveReplay.test.tsx
```

Normal UI: `http://localhost:5175`, Young → Volunteer Nearby, browser device
emulation at 360 px. Restart services only if they are stopped; occupied ports
mean existing servers should be reused. Do not rerun the controlled command:
this approval is consumed. A future genuine live demonstration needs a new budget
and approval; a physical-phone LAN/HTTPS demo and hosted AWS routing/deployment
remain outside this local verification.

## Preserved artifacts

`production-input.json`, `raw-response.json`, `baseline-feed.json`,
`hybrid-feed.json`, `profile-evidence.json`, `reservation.json`, `attempt.json`,
`http.json`, `acceptance.json` and machine-readable `report.json` preserve this test.
No keys or authorization headers are included. `review-offline.mjs` reproduces
the report checks without networking and refuses to overwrite `report.json`.
