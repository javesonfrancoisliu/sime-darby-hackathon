import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { Township } from "@sdh/contracts";
import { db, table } from "../../lib/db";

const TOWNSHIP_ENTITY = "TOWNSHIP";
export const TOWNSHIP_ID = "elmina";

const key = { PK: `TOWNSHIP#${TOWNSHIP_ID}`, SK: "META" };

// Field by field so storage keys and stray attributes never reach a response.
const toTownship = (item: Record<string, unknown>): Township => {
  const line = item.securityLine as Township["securityLine"];
  return {
    id: item.id as string,
    name: item.name as string,
    securityLine: { display: line.display, tel: line.tel },
    emergencyNumber: item.emergencyNumber as string,
    updatedAt: item.updatedAt as string,
  };
};

export async function getTownship(): Promise<Township | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: key }));
  return result.Item ? toTownship(result.Item) : undefined;
}

export async function putTownship(township: Township): Promise<void> {
  await db().send(
    new PutCommand({ TableName: table(), Item: { ...key, entity: TOWNSHIP_ENTITY, ...township } }),
  );
}
