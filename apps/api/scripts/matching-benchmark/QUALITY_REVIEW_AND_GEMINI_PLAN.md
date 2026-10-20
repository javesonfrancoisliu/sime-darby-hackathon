# Historical explanation review and deferred Gemini comparison

This review records the former 140-character contract and proposed comparison. Current production uses 240 characters with a 110-170 target in second person. Claude remains primary; Gemini work is deferred. See [YOUNG_MATCHING.md](../../../../YOUNG_MATCHING.md). Historical measurements below are not current configuration.

Prepared 20 October 2026 by inspecting saved results and production source only.
No tests, evaluation runs, model API calls, AWS calls or credential creation were
performed for this review. Production code and the Claude baseline remain unchanged.

## Strict failures: 3 of 15 responses

All raw responses were syntactically valid JSON with complete, known, unique
candidate labels. The 20% strict failure rate concerns explanation length only:

| Scenario                | Candidate labels | Raw explanation lengths |
| ----------------------- | ---------------- | ----------------------- |
| 06: video calls         | c2, c1           | 170, 163 characters     |
| 09: clinic leaflet      | c2, c3           | 147, 160 characters     |
| 10: clinic registration | c2               | 141 characters          |

The prompt requests at most 140 characters, but the tool schema has no `maxLength`.
The internal `RankingInput` schema deliberately accepts up to 2000 characters so
production can salvage rankings and shorten reasons. Reasons often repeat skills,
experience, distance and availability in multiple clauses, exceeding the limit.
The final response contract requires at most 140 characters. Production therefore
slices and appends an ellipsis, sometimes mid-word or mid-sentence. No candidate
ordering or numeric score was changed by these truncations.

## Two reason replacements: validator false positives

Scenario 13 c3 said "not confirmed as available"; scenario 14 c3 said "not confirmed
available". Both candidates have unknown availability. Both statements correctly
preserve uncertainty. `isGroundedReason` finds the word `available` without checking
negation and replaces the whole explanation with a rule reason. These are two
individual reason replacements, not whole-ranking fallback or model hallucination.

## Additional quality issues in the other responses

The earlier automated checks missed several semantic problems:

- Scenarios 01, 02, 05, 08 and 10, c3: unknown availability becomes "not free".
  An empty schedule proves neither availability nor unavailability. The current
  guard does not catch this wording (`free at` is not covered).
- Scenarios 01 c1, 10 c1 and 12 c1: absent experience is described as never having
  done the task. A profile omission does not establish a negative history.
- Scenario 12 uses volunteer first person throughout; scenario 06 attributes
  digital skills to "you" rather than the helper. Scenario 08 uses an assistant
  first-person introduction. These make speaker and subject less clear.

Consequently, 100% final schema validity and the explanation safety proxy do not
establish factual explanation quality. These findings are a source-based review,
not newly scored human-review results. Original metrics and artifacts are unchanged.

## Proposed improvements, without altering the existing baseline

Validator-only changes can preserve the incoming ordered IDs and numeric scores:

1. Treat uncertainty phrases separately from affirmative availability claims.
   Preserve supported "availability is not confirmed" rather than matching a bare
   keyword. Catch unsupported negative claims as well as positive claims for unknown
   schedules. Do not merely remove every sentence containing a negation.
2. Replace unsupported "never done" claims with fact-based rule explanations.
   Prefer "This experience is not listed" where that is what the profile establishes.
3. Shorten at sentence or word boundaries, with a factual bounded rule reason when
   shortening would remove a crucial qualification. Continue to validate the final
   140-character contract. Unicode handling should follow the contract's actual
   length semantics, including emoji/surrogates in future regression cases.
4. Record reason-treatment categories independently from whole-ranking fallback:
   unchanged, shortened, unsupported claim replaced, uncertainty preserved.

Proposed prompt wording for a later v2: "Write one sentence in third person about
the helper. Aim for 90–110 characters; never exceed 140. Mention the strongest
request-specific evidence. Missing availability means unknown, not unavailable.
Unlisted experience means not stated, not never done." Consider a schema length
constraint only after confirming equivalent support in both providers; retaining
lenient internal parsing avoids discarding an otherwise usable ranking.

Prompt/schema changes may change ranking and therefore cannot promise invariant
ranking behavior. Keep v1 frozen for Gemini's first comparison. Later replay the
saved responses through proposed validator changes offline to check identical IDs,
ordering and scores, plus cases for negation, missing evidence and long reasons.
Those tests have not been run. A new prompt requires a separately versioned v2 and
new approved model runs; never compare v2 Gemini against v1 Claude as equal inputs.

## Equivalent Gemini benchmark plan

`gemini-plan.json` is a disabled, non-executable manifest containing all 15 existing
scenario IDs and input hashes. It references the preserved canonical inputs,
unchanged expected tiers and existing evaluator. It authorizes zero live attempts.

After separate approval, implement a benchmark-only Gemini transport adapter:

- Reuse the exact v1 system text, user JSON bytes, candidate labels/order,
  eligibility filters, scores and `submit_ranking` schema. Map only the vendor API
  envelope. Force that one function call; disable automatic tool execution and do
  not send its result back for a second model turn.
- Use the same 1024 output-token limit and 9000 ms timeout. Document provider
  differences in thinking defaults, tokenization and schema enforcement; do not
  silently give one model extra examples, tighter constraints or extra calls.
- Keep scenario ordering identical, save raw provider response and untouched tool
  arguments, and record latency/usage/errors. Apply the same production-equivalent
  postprocessing policy for a separate final-hybrid report. Keep raw metrics first.
- Reuse identical top-1, NDCG@5, pairwise, JSON, strict validity, explanation proxies,
  blinded human-review rubric, latency and token-cost calculations. Preserve original
  metrics; optionally add a separately labelled semantic-review column for both
  providers rather than changing one side's evaluator.
- Propose at most 15 attempts, no retries or paid-tier fallback. Pace starts to the
  account's actual quota before starting each call; do not count pacing as model
  latency. Record a 429 as a failure without resending it. Stop on unexpected billing
  configuration or missing entitlement rather than switch models/accounts.

## Proposed model and limitations

Candidate: **`gemini-3.8-flash`**, via the Gemini Developer API. Google's current
pricing lists free-tier input and output, and its model catalog recommends 3.8 Flash
or 3.5 Flash-Lite for new projects. This is a reasonable contextual-reranking
candidate, not a claim that it will outperform Claude. Older 2.5 models are currently
restricted to existing active users, so they should not be assumed available to a
new project. No account entitlement or model API has been checked here.

- Free-tier limits depend on the project/tier and may be insufficient or exhausted;
  confirm the actual allowance in AI Studio before authorizing a run. Do not assume
  a fixed public requests-per-minute number.
- Google's pricing identifies free-tier content as used to improve products. Use
  only the same fictional data, with no real elder/volunteer information.
- Confirm the project is actually on the free tier; published free availability
  does not guarantee that an existing paid project will be billed at zero. Never
  enable billing or create a new key/project automatically.
- Function calling can constrain output shape but does not establish truth or
  character-limit compliance. Vendor token counts and thinking behavior differ.
- The historical Claude run and a later Gemini run are not simultaneous; disclose
  network/time-of-day differences when comparing latency. No statistical model
  superiority claim follows from one trial per case.

Sources reviewed:

- [Google pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Google model catalog](https://ai.google.dev/gemini-api/docs/models)
- [Function calling modes](https://ai.google.dev/gemini-api/docs/function-calling)
- [Project rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)

Claude remains the working production baseline. No Gemini adapter, credentials or
live runner has been enabled. Await review before implementing changes or running
tests, and obtain separate approval before any live inference.
