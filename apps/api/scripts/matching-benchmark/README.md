# Offline matching benchmark

This 15-scenario dataset evaluates the historical volunteer-for-request direction. Current Young Volunteer Nearby ranks elderly requests for one volunteer; see [YOUNG_MATCHING.md](../../../../YOUNG_MATCHING.md). Saved reports retain the original 140-character criteria; new offline validation uses 240. Different prompt hashes/criteria must not be presented as identical live experiments.

This framework makes **zero LLM calls**. It does not load credentials, add an SDK,
create keys, or alter the working Claude integration. The implementation
files and this guide live beside the API scripts. The CLI has no live command.
The API `.env` must remain in rules-only mode while preparing comparisons.

## Dataset and expected rankings

`dataset.ts` defines 15 fictional, non-emergency elderly assistance requests across
all six existing categories. Each scenario contains six complete, schema-validated
volunteer profiles: a specialist, generalist, relevant candidate with no
listed skill and unknown availability, unverified candidate, schedule conflict,
and candidate outside 5 km. The existing `rankVolunteers` filters the latter three.

| Scenario | Assistance               | Expected best candidate's distinguishing evidence |
| -------- | ------------------------ | ------------------------------------------------- |
| 01       | Heavy grocery bags       | Carries bags and unloads shopping                 |
| 02       | Pasar shopping list      | Navigates markets and locates ingredients         |
| 03       | Prepaid grocery pickup   | Collects and delivers orders                      |
| 04       | Routine clinic transport | Loads folding walkers into cars                   |
| 05       | Library return trip      | Library lifts and carrying books                  |
| 06       | Video call practice      | Patient, repeated phone instruction               |
| 07       | Suspicious messages      | WhatsApp scam awareness without password access   |
| 08       | Larger phone text        | Accessibility settings and contacts               |
| 09       | Clinic leaflet           | Reading and preparing questions, no diagnosis     |
| 10       | Clinic registration      | Signs and counter navigation                      |
| 11       | Cupboard handle          | Hand tools and screw tightening                   |
| 12       | Light storage boxes      | Low shelves and clear walkways                    |
| 13       | Board-game afternoon     | Welcoming and introducing newcomers               |
| 14       | Garden visit             | Gentle, seated activities                         |
| 15       | Fair timetable           | Reading and locating quiet activities             |

For every case the authored reference order is **specialist → generalist → partial
candidate**. Their UUIDs and a case-specific rationale are explicit in
`expectedTiers`. Tiers allow tied acceptable rankings in future datasets; these
cases have distinct tiers. The specialist's experience directly addresses the
request; both top candidates list the same skill and compatible availability.
The generalist is closer in twelve cases, deliberately challenging the baseline.
Cases 03, 08 and 11 are controls where the specialist is also closer. The partial
candidate has relevant experience but no category skill and unknown availability.
Unknown availability earns no credit and must not be described as confirmed free.

These are **authored benchmark expectations, not observed real-world outcomes**.
Have a teammate review them before model selection. This first dataset focuses on
context versus proximity and excludes emergencies; it is not a representative
production sample, statistical proof of superiority, or a full safety evaluation.
It does not test language preferences absent from the production prompt. Add a
separate held-out dataset, ambiguous/tied cases and additional adversarial cases
before tuning prompts or making broader claims. Do not tune on all 15 and then
report them as independent test evidence.

## Reuse and fair inputs

`compile` calls the existing `rankVolunteers` and `buildMessageRequest`. It reuses
the exact request text, anonymous candidate labels, profile evidence, rounded
distance, availability flag, baseline score, system instructions, tool schema,
forced tool choice and 1024 output-token cap used by Claude. The canonical input
excludes the model ID. SHA-256 hashes bind the dataset version, scenario ID and
canonical request; modified inputs require a new dataset version and new runs.
Gold rankings, rationales, names and UUIDs are not included in exported model input.

The future Claude adapter should send the prepared request with the chosen model
ID using the existing integration. A future Gemini adapter should translate only
the API wrapper: use the same system string, user JSON bytes, tool name/schema and
forced function-call semantics. Do not append examples, hints or gold answers to
one provider's input. If a model cannot support this contract, disclose that and
do not silently weaken only its test. Equivalent semantics do not mean identical
vendor request envelopes or token counts. Both models see the same shortlist order.

For each approved future live run, freeze exact model/version, SDK/version and
generation settings. Use no automatic retries, one request per case, the same
9000 ms timeout, standard inference and no prompt caching, external tools or
thinking extensions where configurable. Different defaults must be recorded as
limitations. Record monotonic latency around the model HTTP call only, including
response download and excluding AWS key retrieval, eligibility filtering and file
IO. Alternate providers by case to reduce time-of-day bias. Repeated trials need
their own approved budget. The transport-injected `collect.ts` reuses the production matching service and
reranker. No live SDK entry point remains enabled; a separately approved temporary
entry point was removed after the run linked below.

## Evaluation

Evaluation consumes **raw saved outputs before fallback or repair**. Anthropic
tool input or Gemini function-call arguments should be serialized unchanged as
the record's `output` JSON string. Preserve malformed text if no valid arguments
were returned. Do not strip code fences, fix IDs, fill omitted candidates, truncate
reasons or use fallback results as model output. On timeout/provider failure use
an empty `output` and a sanitized `error` code. Never save SDK exceptions, headers,
keys or real personal data.

| Dimension         | Metric and interpretation                                                                                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ranking relevance | Top-1 accuracy; NDCG@5 with tier relevance 3/2/1 and gain `2^relevance - 1`; pairwise accuracy across distinct tiers                                                                                                                             |
| Context           | Best-candidate explanation contains a scenario-specific evidence anchor: a **lexical proxy**, not a semantic understanding score                                                                                                                 |
| Explanation       | Rate passing the current 240-character limit, existing contact/link checks, common qualification grounding and unknown-availability checks; validated profile schedule times are allowed rather than counted as phone-like numbers; also a proxy |
| JSON              | Raw syntax validity separately from schema/semantic completeness: all eligible labels exactly once, no unknowns or duplicates, bounded reasons                                                                                                   |
| Latency           | Nearest-rank p50/p95 of recorded durations, including observed failures; missing measurements are excluded and coverage is shown                                                                                                                 |
| Cost              | Actual provider token counts × supplied dated rates; missing usage/rates produce `null`, never an invented zero                                                                                                                                  |

Ranking metrics can give partial credit to incomplete/invalid rankings, while
`strictValid` independently fails them. Missing records count as failures in
validity, top-1 and ranking metrics; they are not silently dropped. Unknown or
duplicate scenario IDs and changed hashes reject the run. Check strict validity,
unknown-label counts and grounding before comparing ranking scores. There is no
weighted overall winner or statistical significance claim from 15 scenarios.
The automated checks cannot detect every hallucination or assess writing warmth.

Use blinded human review for each provider/case, ideally two independent reviewers
with differences resolved against the supplied profile evidence. Record scores in
`humanReview`, from 0 (absent/wrong/unsafe) to 4 (fully meets criterion):

- `contextualUnderstanding`: 1 mentions only category; 2 fits part of the task;
  3 uses its main constraint; 4 explains the relevant experience and tradeoff.
- `explanationQuality`: 1 confusing; 2 understandable but generic; 3 concise and
  useful; 4 concise, specific, respectful and clear for an elderly reader.
- `grounding`: 1 major invented claim; 2 unsupported minor claims; 3 factual with
  omissions; 4 every claim supported and uncertainty preserved. Score 0 for a
  materially unsafe claim or no usable explanation.

Absent human reviews remain `null`. Reports show review coverage and each mean
separately. Do not substitute the anchor proxy for human contextual understanding.

## Commands (from repository root)

These write under the API's ignored `node_modules/.cache` directory. Every command
refuses to overwrite an existing output file; choose new filenames for later runs.

```powershell
pnpm.cmd --filter @sdh/api benchmark:matching prepare --out node_modules/.cache/matching-benchmark/inputs-v1-final.json
pnpm.cmd --filter @sdh/api benchmark:matching rules --out node_modules/.cache/matching-benchmark/rules-v1-final.json
pnpm.cmd --filter @sdh/api benchmark:matching evaluate --input node_modules/.cache/matching-benchmark/rules-v1-final.json --out node_modules/.cache/matching-benchmark/rules-report-v1-final.json
pnpm.cmd --filter @sdh/api benchmark:matching template --out node_modules/.cache/matching-benchmark/model-template-v1-final.json
pnpm.cmd --filter @sdh/api exec vitest run scripts/matching-benchmark/benchmark.test.ts --maxWorkers=2
```

`rules` measures the current local scorer and reason construction, excluding input
preparation. Its CPU latency is a baseline, not comparable to remote network latency.
Its LLM cost is inherently zero, but the generic token-cost report stays `null`
because no provider usage is present. `template` is empty, marked `mock`, and has
placeholder durations; it is not a model prediction or measured latency report.
The synthetic oracle used by unit tests only verifies the evaluator's mathematics.

Once future inference has been explicitly authorized and separately collected:

```powershell
pnpm.cmd --filter @sdh/api benchmark:matching compare --left node_modules/.cache/matching-benchmark/haiku-live-v1.json --right node_modules/.cache/matching-benchmark/gemini-live-v1.json --out node_modules/.cache/matching-benchmark/comparison-v1.json
```

The comparison contains both per-case reports, model/run-kind labels, coverage,
ranking, validity, human review, latency and cost summaries. Claude has now been evaluated in one explicitly approved 15-attempt run; see
[the live report](results/haiku-2026-10-20/REPORT.md). Gemini has not been run.
The earlier single Claude smoke test is not benchmark data.

## Saved-run format and pricing

Use `template` for current scenario hashes. Change `provider`, exact `model` and
`runKind` only to reflect actual provenance. A record looks like:

```json
{
  "scenarioId": "scenario-01",
  "inputHash": "copy-exact-hash-from-prepared-input",
  "output": "{\"ranking\":[{\"candidate\":\"c2\",\"reason\":\"Relevant evidence from this fictional profile.\"}]}",
  "latencyMs": 250,
  "usage": {
    "inputTokens": 1000,
    "outputTokens": 100,
    "cacheReadTokens": 0,
    "cacheWriteTokens": 0
  },
  "humanReview": {
    "contextualUnderstanding": 3,
    "explanationQuality": 3,
    "grounding": 4,
    "notes": "Reviewer rationale"
  }
}
```

This illustrative partial output would fail strict completeness. Usage input tokens
must mean **uncached input tokens**; provide cache reads/writes separately to avoid
double counting. Include all billed output tokens, including thinking tokens if a
future provider uses them. Normalize vendor usage fields carefully. At the run
level optionally supply `pricing` with `asOf`, `source`, `inputUsdPerMillion`,
`outputUsdPerMillion`, and cache rates when applicable. Rates are deliberately not
hardcoded or fetched. Confirm rates and entitlements at collection time. A
prospective Gemini free tier must not be assumed free or available: record zero
rates only after confirming that the actual run qualifies. Credits, taxes, AWS
SSM access and account adjustments are separate from list-price token estimates.

Preparing and evaluating the offline framework makes no live calls. The separate
15-attempt Claude run was explicitly approved and is documented below. No keys,
cloud resources, application matching behavior or existing Claude settings were changed. Do not enable an app model just
to prepare this benchmark. Any future inference collector or billable run requires
separate approval and an explicit request-count/budget limit.

## Initial offline baseline

The generated `rules-report-v1-final.json` contains all 15 final scenarios:
JSON and strict validity 100%, top-1 reference agreement 20%, NDCG@5 0.8743,
and pairwise accuracy 73.33%. All rule reasons pass the benchmark's concise/safety
proxy. The context-anchor proxy is 0% because generic rule explanations do not
describe the distinctive experience. No human ratings or LLM cost are measured.
This deliberately context-heavy test set explains low top-1 agreement; it is not
an estimate of overall production accuracy. No Claude/Gemini comparison can be made until equivalent approved Gemini runs
and blinded reviews exist. The separate Claude-versus-rules result is in
[the approved live report](results/haiku-2026-10-20/REPORT.md).

CLI smoke checks prepared canonical inputs, a real rules baseline, a blank mock
template and an offline comparison against that template. The latter only tests
reporting; its empty outputs and zero placeholder latency are not model results.
Earlier non-final files under the ignored cache directory are preparatory drafts;
use the `*-v1-final.json` artifacts referenced above.
