// Loads fictional elders and youth volunteers through the real API (no DynamoDB access).
// Local: pnpm --filter @sdh/api demo:personas -- --local --base-url http://localhost:3001 [--pass seed|finish] [--yes]
// Dev: AWS_PROFILE=<profile> pnpm --filter @sdh/api demo:personas -- --cognito --base-url https://<host> --user-pool-id <id> --client-id <id> --region <region> --i-know-this-is-dev [--pass seed|finish] [--yes]
// Without --yes it is a dry run. Cognito logins are written only to docs/CREDENTIAL.md (gitignored).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import {
  USAGE,
  cognitoIdentity,
  fileCredentialStore,
  httpCall,
  localIdentity,
  planLines,
  resolveConfig,
  runFinish,
  runSeed,
  type Identity,
} from "./demo-personas-lib";

const CREDENTIAL_PATH = fileURLToPath(new URL("../../../docs/CREDENTIAL.md", import.meta.url));

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const resolved = resolveConfig(process.argv.slice(2), process.env);
if (!resolved.ok) fail(`${resolved.error}\n${USAGE}`);
const { config } = resolved;

if (!config.yes) {
  for (const line of planLines(config)) console.info(line);
  process.exit(0);
}

const call = httpCall(config.baseUrl);
let identity: Identity;
if (config.mode === "local" || !config.cognito) {
  identity = localIdentity(call);
} else {
  const { region, userPoolId, clientId, profile } = config.cognito;
  // The credentials file must be ignored by git before any login is written to it.
  const ignored = spawnSync("git", ["check-ignore", "-q", CREDENTIAL_PATH]);
  if (ignored.status !== 0) fail("Refusing to run: docs/CREDENTIAL.md is not gitignored");
  identity = cognitoIdentity({
    client: new CognitoIdentityProviderClient({ region }),
    userPoolId,
    clientId,
    store: fileCredentialStore(CREDENTIAL_PATH),
  });
  console.info(`Pool ${userPoolId}, profile ${profile}, region ${region}`);
}

console.info(`Target: ${config.baseUrl} (${config.mode}, pass ${config.pass})`);
try {
  const deps = { call, identity, log: (line: string) => console.info(line) };
  if (config.pass === "seed") await runSeed(deps);
  else await runFinish(deps);
} catch (err) {
  fail(err instanceof Error ? err.message : "Demo personas failed");
}
