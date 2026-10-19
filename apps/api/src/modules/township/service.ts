import type { PutTownshipBody, Township } from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { nowIso } from "../../lib/time";
import { getTownship, putTownship, TOWNSHIP_ID } from "./repository";

export async function readTownship(): Promise<Township> {
  const township = await getTownship();
  if (!township) throw new HttpError("NOT_FOUND", "Township is not configured");
  return township;
}

export async function saveTownship(body: PutTownshipBody): Promise<Township> {
  const township: Township = {
    id: TOWNSHIP_ID,
    name: body.name,
    securityLine: { display: body.securityLine.display, tel: body.securityLine.tel },
    emergencyNumber: body.emergencyNumber,
    updatedAt: nowIso(),
  };
  await putTownship(township);
  return township;
}
