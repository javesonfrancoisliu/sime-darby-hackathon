import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { replaySavedResponses } from "./replay";
const report = await replaySavedResponses();
const output = process.argv[2]
  ? resolve(process.argv[2])
  : new URL("./results/explanation-replay-2026-10-20/report.json", import.meta.url);
mkdirSync(typeof output === "string" ? dirname(output) : new URL("./", output), {
  recursive: true,
});
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, {
  flag: "wx",
});
console.log(JSON.stringify({ ...report, results: undefined }, null, 2));
