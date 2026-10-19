import { DEFAULT_PAGE_SIZE, type Paged, type PointsLedgerEntry } from "@sdh/contracts";
import { listLedger } from "./repository";

export { CHECK_IN_POINTS, TEAM_CONTRIBUTION_POINTS, VOLUNTEERING_POINTS } from "./constants";
export {
  awardItems,
  awardOnce,
  redeem,
  redeemItems,
  type Award,
  type AwardOutcome,
  type RedeemOutcome,
} from "./repository";

export function ledgerPage(
  userId: string,
  cursor?: string,
  limit: number = DEFAULT_PAGE_SIZE,
): Promise<Paged<PointsLedgerEntry>> {
  return listLedger(userId, cursor, limit);
}
