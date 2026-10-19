import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { Notice, NoticeKind } from "@sdh/contracts";
import { db, table } from "../../lib/db";

const NOTICE_ENTITY = "NOTICE";
export const NOTICE_KINDS: NoticeKind[] = ["maintenance", "update"];

const key = (id: string) => ({ PK: `NOTICE#${id}`, SK: "META" });
const byPublishedKeys = (notice: Pick<Notice, "kind" | "publishedAt">) => ({
  GSI1PK: `NOTICE#${notice.kind}`,
  GSI1SK: notice.publishedAt,
});

// Field by field; optional maintenance fields are copied only when stored.
export const toNotice = (item: Record<string, unknown>): Notice => {
  const notice: Notice = {
    id: item.id as string,
    kind: item.kind as Notice["kind"],
    title: item.title as string,
    description: (item.description as string | undefined) ?? "",
    area: item.area as string,
    topic: item.topic as string,
    priority: item.priority as Notice["priority"],
    source: item.source as string,
    publishedAt: item.publishedAt as string,
    createdBy: item.createdBy as string,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
  if (item.windowStart !== undefined) notice.windowStart = item.windowStart as string;
  if (item.windowEnd !== undefined) notice.windowEnd = item.windowEnd as string;
  if (item.impact !== undefined) notice.impact = item.impact as string;
  if (item.status !== undefined) notice.status = item.status as Notice["status"];
  return notice;
};

export async function putNotice(notice: Notice, mustExist: boolean): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { ...key(notice.id), ...byPublishedKeys(notice), entity: NOTICE_ENTITY, ...notice },
      ConditionExpression: mustExist ? "attribute_exists(PK)" : "attribute_not_exists(PK)",
    }),
  );
}

export async function getNotice(id: string): Promise<Notice | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: key(id) }));
  return result.Item ? toNotice(result.Item) : undefined;
}

// Position of the last item already returned, in (publishedAt, id) descending order.
export interface NoticePosition {
  publishedAt: string;
  id: string;
}

export const isAfterPosition = (notice: Notice, after: NoticePosition | undefined): boolean =>
  !after ||
  notice.publishedAt < after.publishedAt ||
  (notice.publishedAt === after.publishedAt && notice.id < after.id);

export const compareNewestFirst = (a: Notice, b: Notice): number =>
  a.publishedAt === b.publishedAt
    ? b.id.localeCompare(a.id)
    : b.publishedAt.localeCompare(a.publishedAt);

// Newest first. Walks the index page by page and keeps only items that pass `visible` and sort
// after `after`, until `need` items are found or the kind is exhausted.
export async function listKind(
  kind: NoticeKind,
  after: NoticePosition | undefined,
  need: number,
  visible: (notice: Notice) => boolean,
): Promise<Notice[]> {
  const found: Notice[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI1",
        KeyConditionExpression: after ? "GSI1PK = :pk AND GSI1SK <= :ts" : "GSI1PK = :pk",
        ExpressionAttributeValues: after
          ? { ":pk": `NOTICE#${kind}`, ":ts": after.publishedAt }
          : { ":pk": `NOTICE#${kind}` },
        ScanIndexForward: false,
        Limit: need,
        ExclusiveStartKey: startKey,
      }),
    );
    for (const item of result.Items ?? []) {
      const notice = toNotice(item);
      if (visible(notice) && isAfterPosition(notice, after)) found.push(notice);
    }
    startKey = result.LastEvaluatedKey;
  } while (startKey && found.length < need);
  return found;
}
