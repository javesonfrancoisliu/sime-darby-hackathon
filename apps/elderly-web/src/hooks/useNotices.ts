import type { NoticeKind } from "@sdh/contracts";
import { noticesApi } from "../api/notices";
import { useLiveQuery } from "./useLiveQuery";

const NOTICES_REFRESH_MS = 60_000;

export function useNotices(kind: NoticeKind) {
  return useLiveQuery(`notices:${kind}`, () => noticesApi.list(kind), NOTICES_REFRESH_MS);
}
