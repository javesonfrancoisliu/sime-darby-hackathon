// Offline only. There is deliberately no live provider adapter or credentials loader.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { performance } from "node:perf_hooks";
import { DATASET_VERSION, scenarios } from "./dataset";
import { compare, compile, evaluate, SavedRun } from "./evaluate";
import { rankVolunteers, ruleReason } from "../../src/modules/matching/scoring";

const [command, ...args] = process.argv.slice(2);
const value = (name: string) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1] || args[index + 1]!.startsWith("--"))
    throw new Error(`Missing ${name}`);
  return args[index + 1]!;
};
function save(path: string, data: unknown) {
  // Refuse to overwrite existing measurements or source files.
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, { flag: "wx" });
}

if (command === "prepare") {
  const cases = scenarios.map((scenario) => {
    const { inputHash, request } = compile(scenario);
    return { scenarioId: scenario.id, inputHash, request };
  });
  save(value("--out"), { datasetVersion: DATASET_VERSION, liveInferenceEnabled: false, cases });
  console.log(
    `Prepared ${cases.length} identical provider-neutral inputs. No inference calls made.`,
  );
} else if (command === "rules") {
  const records = scenarios.map((scenario) => {
    const { inputHash } = compile(scenario);
    const start = performance.now();
    const candidates = rankVolunteers(scenario.target, scenario.volunteers);
    return {
      scenarioId: scenario.id,
      inputHash,
      output: JSON.stringify({
        ranking: candidates.map((candidate, index) => ({
          candidate: `c${index + 1}`,
          reason: ruleReason(candidate),
        })),
      }),
      latencyMs: performance.now() - start,
    };
  });
  const run = SavedRun.parse({
    datasetVersion: DATASET_VERSION,
    provider: "local",
    model: "existing-rules-50-30-20",
    runKind: "rules",
    records,
  });
  save(value("--out"), run);
  console.log(JSON.stringify(evaluate(run).summary, null, 2));
} else if (command === "evaluate") {
  const report = evaluate(JSON.parse(readFileSync(value("--input"), "utf8")));
  save(value("--out"), report);
  console.log(JSON.stringify(report.summary, null, 2));
} else if (command === "compare") {
  const report = compare(
    JSON.parse(readFileSync(value("--left"), "utf8")),
    JSON.parse(readFileSync(value("--right"), "utf8")),
  );
  save(value("--out"), report);
  console.log(
    JSON.stringify(
      {
        completeCoverage: report.completeCoverage,
        summaries: report.runs.map((run) => ({
          model: run.model,
          runKind: run.runKind,
          ...run.summary,
        })),
      },
      null,
      2,
    ),
  );
} else if (command === "template") {
  save(value("--out"), {
    datasetVersion: DATASET_VERSION,
    provider: "replace-provider",
    model: "replace-model",
    runKind: "mock",
    records: scenarios.map((scenario) => ({
      scenarioId: scenario.id,
      inputHash: compile(scenario).inputHash,
      output: "",
      latencyMs: 0,
    })),
  });
  console.log("Prepared an empty saved-run template. No predictions or inference calls made.");
} else {
  throw new Error(
    "Offline commands: prepare --out FILE | rules --out FILE | template --out FILE | evaluate --input FILE --out FILE | compare --left FILE --right FILE --out FILE. Live inference is not implemented.",
  );
}
