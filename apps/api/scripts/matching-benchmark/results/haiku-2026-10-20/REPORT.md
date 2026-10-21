# Claude Haiku 5.5 versus rules — approved live benchmark

Run date: 20 October 2026. Dataset: `township-matching-v1`, 15 fictional scenarios.
Exactly **15 inference request attempts**, one per scenario, with no retries.
All returned `claude-haiku-5-5` responses. No failed or timed-out requests occurred.
No whole-ranking fallback occurred; all final outcomes identify `rankedBy: ai`.

| Metric                                   | Rule-based baseline |                Raw Claude |            Final hybrid pipeline |
| ---------------------------------------- | ------------------: | ------------------------: | -------------------------------: |
| NDCG@5                                   |              0.8743 |                    0.9981 |                           0.9981 |
| Expected top choice                      |          3/15 (20%) |              15/15 (100%) |                     15/15 (100%) |
| Pairwise accuracy                        |              73.33% |                    97.78% |                           97.78% |
| JSON syntax validity                     |                100% |                      100% |                             100% |
| Strict validity, including reason length |                100% |               12/15 (80%) |                     15/15 (100%) |
| Safe/concise explanation proxy           |                100% |            38/45 (84.44%) |                     45/45 (100%) |
| Contextual evidence anchor proxy         |                  0% |                      100% |                             100% |
| p50 latency                              |  0.025 ms local CPU | 1,669 ms model round trip |   Same captured model round trip |
| p95 latency                              |  0.165 ms local CPU | 2,612 ms model round trip |   Same captured model round trip |
| Inference token cost, USD                |                  $0 |                $0.0032759 | Same 15 requests; no extra calls |

Rules latency measures local scoring/reason construction. Claude latency measures
the model HTTP call through full response receipt, excluding SSM key retrieval,
input preparation and result-file writes. These are different kinds of latency;
the hybrid column is not an independently measured end-to-end service duration.
The raw and final columns describe the same responses, not two separate runs.

## Actual usage and cost

- Input: **17,994 tokens**.
- Output: **2,953 tokens**; total **20,947 tokens**.
- Cache reads/writes: **0**; thinking tokens: **0**.
- Tier/geography: standard/global; no tools with separate server-side fees.
- Estimate: `(17,994 × $0.10 + 2,953 × $0.50) / 1,000,000`
  = **$0.0032759 USD**, approximately **0.328 US cents**.
- Pricing: [Anthropic short-prompt list rates](https://platform.claude.com/docs/en/about-claude/pricing),
  dated 20 October 2026. This excludes taxes, account adjustments and separate AWS
  Parameter Store charges. It is an estimate, not an account billing statement.

All 15 responses include usage, so no usage had to be estimated or treated as zero.
The earlier single-request smoke test is not included in these totals.

## Raw results, repairs and fallback

Raw JSON and candidate identity/completeness were valid in all cases. Strict raw
validity failed in scenarios 06, 09 and 10 because explanations exceeded 140
characters. The unchanged production reranker truncated five explanations:
two in 06, two in 09, one in 10. Some truncations end mid-sentence; this is a
remaining explanation-quality limitation, not an evaluator repair.

In scenarios 13 and 14, the unchanged production availability guard replaced one
explanation each with a rule reason. Both original explanations correctly said
availability was **not confirmed**, but the conservative keyword guard matched
the word `available`. These two replacements are false positives of that guard,
not evidence that the model invented availability. The benchmark's automated
safety proxy shares that limitation. No integration fix or extra live request was
made during this run.

Thus there were **0 whole-ranking fallback cases**, **2 individual rule-reason
replacements**, and **5 length truncations**, across 45 explanations. The final
schema score must not be confused with raw model compliance.

Scenario 15 was the only ranking disagreement: Claude chose the expected best
helper but placed the relevant partial-skill candidate ahead of the listed-skill
generalist. This produced NDCG@5 0.9721 and pairwise accuracy 2/3 for that case.
The authored reference favours the listed-skill/confirmed-availability generalist
for second place; another reviewer could reasonably debate that tradeoff.

## Pipeline and comparison integrity

`collect.ts` calls the existing `createMatchingService` with fictional full
profiles and the existing `createClaudeReranker`. It therefore uses production
role/verification/radius/schedule filtering, 50/30/20 scoring, shortlisting,
prompt/tool construction, runtime validation, reason handling and fallback.
An injected send function only instruments the actual SDK transport. Before each
send it compares the production request byte-for-byte against `compile`'s canonical
request excluding the model ID. The same input hashes and evaluator were used for
the baseline. Numeric suitability percentages remain rule-based, not AI probabilities.

The runner reused the `sdh-dev` profile in `ap-southeast-5` and the existing
SSM key helper. The key stayed in memory. No credentials, response headers or raw
SDK errors are stored in these artifacts. No new keys, IAM changes, infrastructure
or database writes were made. Application model configuration remained blank.

SDK retries were disabled, redirects refused, each scenario allowed one transport
attempt, and an exclusive reservation prevented restarting the approved run.
Attempt markers and raw responses were checkpointed locally. The temporary live
entry point was removed after completion. Further live inference needs fresh approval.

## Interpretation and artifacts

NDCG improved by **0.1239**, but this small authored dataset deliberately stresses
experience-versus-proximity tradeoffs. It includes three simpler controls and is
not a representative production sample. There was one sample per case, no repeated
trial, no statistical significance assessment and no blinded human review.
Context-anchor and safety checks are lexical proxies, not proof of understanding,
factual correctness or elderly usability. A Gemini comparison has not been run.

- `inputs.json`: canonical prompts and hashes, without gold rankings.
- `baseline-run.json`, `baseline-report.json`: the exact paired rules baseline.
- `raw-run.json`, `raw-report.json`: untouched tool arguments and their evaluation.
- `scenario-XX-raw.json`: full returned model content, usage and stop reason.
- `scenario-XX-attempt.json`, `reservation.json`: request-count audit markers.
- `scenario-XX.json`, `outcomes.json`: raw records plus final production matches/source.
- `hybrid-report.json`: evaluation after production validation/repair/fallback.
- `comparison.json`: rules versus raw Claude evaluation with identical hashes.

These artifacts contain fictional data only and are preserved in the repository
working tree, not just under disposable `node_modules`. No files were committed
or pushed automatically.
