// Synchronizes the local demo reward catalogue while preserving reward IDs and redemptions.
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { rewards } from "./content/rewards";
import { config, isLoopbackEndpoint } from "../src/lib/config";
import { db, table } from "../src/lib/db";
import { listRewards } from "../src/modules/rewards/repository";
import { createReward } from "../src/modules/rewards/service";

if (!isLoopbackEndpoint(config.dynamodbEndpoint)) {
  throw new Error("Refusing to sync: DYNAMODB_ENDPOINT must be a loopback endpoint.");
}
const existing = await listRewards();
for (const reward of rewards) {
  const matches = existing.filter((item) => item.title === reward.title);
  if (matches.length === 0) {
    if (reward.active) await createReward(reward);
    continue;
  }
  for (const match of matches) {
    const fields = { ...reward, updatedAt: new Date().toISOString() };
    const entries = Object.entries(fields);
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: { PK: `REWARD#${match.id}`, SK: "META" },
        UpdateExpression: `SET ${entries.map((_, i) => `#field${i} = :value${i}`).join(", ")}`,
        ExpressionAttributeNames: Object.fromEntries(
          entries.map(([name], i) => [`#field${i}`, name]),
        ),
        ExpressionAttributeValues: Object.fromEntries(
          entries.map(([, value], i) => [`:value${i}`, value]),
        ),
        ConditionExpression: "attribute_exists(PK)",
      }),
    );
  }
}
console.info(
  "Local rewards updated: grocery voucher (100 pts), blood pressure check (150 pts), breakfast set (120 pts).",
);
