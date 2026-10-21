// Offline only: reads the saved one-attempt artifacts; never imports an API client.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stdout } from "node:process";

const directory = dirname(fileURLToPath(import.meta.url));
const read = (name) =>
  JSON.parse(readFileSync(join(directory, `${name}.json`), "utf8").replace(/^\uFEFF/, ""));
const baseline = read("baseline-feed"),
  hybrid = read("hybrid-feed");
const raw = read("raw-response"),
  input = read("production-input");
const payload = JSON.parse(input.messages[0].content);
const ranking = raw.content.find(
  (block) => block.type === "tool_use" && block.name === "submit_ranking",
).input.ranking;
const requests = hybrid.items.filter((item) => item.kind === "request");
assert.equal(read("reservation").limit, 1);
assert.equal(read("attempt").attempt, 1);
assert.equal(raw.status, 200);
assert.equal(raw.model, "claude-haiku-5-5");
assert.equal(payload.requests.length, 3);
const rows = requests.map((item) => {
  const before = baseline.items.find(
    (old) => old.kind === "request" && old.request.id === item.request.id,
  );
  const evidence = payload.requests.find((request) => request.title === item.request.title);
  const original = ranking.find((candidate) => candidate.candidate === evidence.label).reason;
  assert.equal(item.matchScore, before.matchScore);
  assert.equal(item.matchScore, evidence.ruleScore);
  assert.equal(item.matchSource, "ai");
  assert.ok(item.reasons[0].length <= 140);
  const treatment = original === item.reasons[0] ? "unchanged" : "length-fallback-to-rule-evidence";
  if (treatment !== "unchanged") assert.ok(original.length > 140);
  return {
    title: item.request.title,
    id: item.request.id,
    label: evidence.label,
    baselineScore: before.matchScore,
    finalScore: item.matchScore,
    baselineRank: before.matchRank,
    finalRank: item.matchRank,
    rawReason: original,
    rawCharacters: original.length,
    finalReason: item.reasons[0],
    finalCharacters: item.reasons[0].length,
    treatment,
  };
});
assert.deepEqual(
  rows.map((row) => row.label),
  ranking.map((row) => row.candidate),
);
assert.ok(
  hybrid.items
    .filter((item) => item.kind === "event")
    .every((item) => item.matchSource === "rules"),
);
const acceptance = read("acceptance");
assert.equal(acceptance.status, "matched");
assert.equal(acceptance.acceptHttpStatus, 200);
assert.equal(acceptance.trackedHttpStatus, 200);
assert.equal(acceptance.absentFromOpenFeed, true);
assert.equal(acceptance.restoredFeedAllRules, true);
assert.equal(acceptance.persistentModelDisabled, true);
const report = {
  model: raw.model,
  inferenceAttempts: 1,
  automaticRetries: 0,
  usage: raw.usage,
  estimatedCostUsd: (raw.usage.input_tokens * 0.1 + raw.usage.output_tokens * 0.5) / 1_000_000,
  pricingSource: "https://platform.claude.com/docs/en/models/haiku-5-5/overview",
  modelTransportLatencyMs: raw.latencyMs,
  feedHttp: read("http"),
  rawStructuredRankingValid: true,
  rawAllExplanationsWithin140: rows.every((row) => row.rawCharacters <= 140),
  finalAllExplanationsWithin140: true,
  rankingFallback: false,
  explanationFallbackCount: rows.filter((row) => row.treatment !== "unchanged").length,
  scoresUnchanged: true,
  rankingChangedFromBaseline: rows.some((row) => row.baselineRank !== row.finalRank),
  communityEventsRemainRules: true,
  frontendVerification:
    "Saved genuine response rendered through Young-role React page; source, reasons, scores and all sorts passed. No connected visual browser.",
  acceptance,
  rows,
  limitations: [
    "One production request, not a ranking-quality benchmark.",
    "Claude retained baseline order; this sample does not demonstrate an order improvement.",
    "AI-assisted describes ranking; the leaflet explanation uses validated factual fallback.",
    "Actual browser screenshot and 360 px visual inspection of the genuine result remain unverified.",
    "Guarded API stopped; normal rules-only API and Vite frontends restored.",
  ],
};
writeFileSync(join(directory, "report.json"), JSON.stringify(report, null, 2) + "\n", {
  flag: "wx",
});
stdout.write(JSON.stringify(report, null, 2) + "\n");
