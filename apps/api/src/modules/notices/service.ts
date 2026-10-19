import { randomUUID } from "node:crypto";
import type {
  CreateNoticeBody,
  Notice,
  NoticeKind,
  NoticesQuery,
  Paged,
  PatchNoticeBody,
  User,
} from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { decodeCursor, encodeCursor, type LastKey } from "../../lib/paging";
import { nowIso, toUtc } from "../../lib/time";
import {
  compareNewestFirst,
  getNotice,
  listKind,
  NOTICE_KINDS,
  putNotice,
  type NoticePosition,
} from "./repository";

// Completed maintenance stays visible for this long after its window ends.
const COMPLETED_VISIBLE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const optionalUtc = (iso: string | undefined) => (iso === undefined ? undefined : toUtc(iso));

export function isHidden(notice: Notice, nowMs: number): boolean {
  if (notice.kind !== "maintenance" || notice.status !== "completed" || !notice.windowEnd) {
    return false;
  }
  return Date.parse(notice.windowEnd) < nowMs - COMPLETED_VISIBLE_DAYS * DAY_MS;
}

export async function listNotices(query: NoticesQuery): Promise<Paged<Notice>> {
  const scope: LastKey = query.kind ? { GSI1PK: `NOTICE#${query.kind}` } : {};
  const cursor = decodeCursor(query.cursor, scope);
  const after: NoticePosition | undefined = cursor?.GSI1SK
    ? { publishedAt: cursor.GSI1SK, id: (cursor.PK ?? "").replace(/^NOTICE#/, "") }
    : undefined;
  if (query.cursor && !after) throw new HttpError("VALIDATION_FAILED", "cursor: invalid");
  const nowMs = Date.now();
  const kinds: NoticeKind[] = query.kind ? [query.kind] : NOTICE_KINDS;
  // One extra item tells whether a next page exists.
  const need = query.limit + 1;
  const perKind = await Promise.all(
    kinds.map((kind) => listKind(kind, after, need, (n) => !isHidden(n, nowMs))),
  );
  const merged = perKind.flat().sort(compareNewestFirst);
  const items = merged.slice(0, query.limit);
  const last = items[items.length - 1];
  if (merged.length <= query.limit || !last) return { items };
  const nextCursor = encodeCursor({
    PK: `NOTICE#${last.id}`,
    SK: "META",
    GSI1PK: `NOTICE#${last.kind}`,
    GSI1SK: last.publishedAt,
  });
  return nextCursor ? { items, nextCursor } : { items };
}

export async function createNotice(coordinator: User, body: CreateNoticeBody): Promise<Notice> {
  const now = nowIso();
  const notice: Notice = {
    id: randomUUID(),
    kind: body.kind,
    title: body.title,
    description: body.description,
    area: body.area,
    topic: body.topic,
    priority: body.priority,
    source: body.source,
    publishedAt: now,
    createdBy: coordinator.id,
    createdAt: now,
    updatedAt: now,
  };
  if (body.kind === "maintenance") {
    notice.windowStart = optionalUtc(body.windowStart);
    notice.windowEnd = optionalUtc(body.windowEnd);
    notice.status = body.status ?? "scheduled";
    if (body.impact !== undefined) notice.impact = body.impact;
  }
  await putNotice(notice, false);
  return notice;
}

export async function patchNotice(id: string, patch: PatchNoticeBody): Promise<Notice> {
  const current = await getNotice(id);
  if (!current) throw new HttpError("NOT_FOUND", "Notice not found");
  const isUpdate = current.kind === "update";
  if (isUpdate && (patch.windowStart || patch.windowEnd || patch.impact || patch.status)) {
    throw new HttpError("VALIDATION_FAILED", "Window, impact and status are for maintenance only");
  }
  const next: Notice = {
    ...current,
    ...patch,
    windowStart: optionalUtc(patch.windowStart ?? current.windowStart),
    windowEnd: optionalUtc(patch.windowEnd ?? current.windowEnd),
    updatedAt: nowIso(),
  };
  if (isUpdate) {
    delete next.windowStart;
    delete next.windowEnd;
  } else if (
    !next.windowStart ||
    !next.windowEnd ||
    Date.parse(next.windowStart) >= Date.parse(next.windowEnd)
  ) {
    throw new HttpError("VALIDATION_FAILED", "windowStart must be before windowEnd");
  }
  await putNotice(next, true);
  return next;
}
