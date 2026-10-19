import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { FacilityReport, SafetyReading } from "@sdh/contracts";
import { db, table } from "../../lib/db";

const READING_ENTITY = "SAFETY_READING";
const FACILITY_ENTITY = "FACILITY_REPORT";
// Facility reports shown on the safety screens; newest updated first.
export const FACILITY_REPORT_LIMIT = 50;

const SAFETY_PK = "SAFETY";
const normalise = (part: string) => encodeURIComponent(part.trim().toLowerCase());

// One item per type and area; water readings are per named water point.
export const readingSortKey = (reading: SafetyReading): string =>
  reading.type === "water"
    ? `water#${normalise(reading.area)}#${normalise(reading.name)}`
    : `${reading.type}#${normalise(reading.area)}`;

// Field by field, per type, so storage keys never leak into a response.
export function toReading(item: Record<string, unknown>): SafetyReading {
  const base = {
    area: item.area as string,
    value: item.value as number,
    unit: item.unit as string,
    advice: item.advice as string,
    measuredAt: item.measuredAt as string,
  };
  if (item.type === "water") {
    return {
      type: "water",
      level: item.level as "normal" | "watch" | "warning" | "danger",
      name: item.name as string,
      waterBody: item.waterBody as "river" | "lake",
      normalMax: item.normalMax as number,
      ...base,
    };
  }
  if (item.type === "heat") {
    return {
      type: "heat",
      level: item.level as "normal" | "warning" | "danger",
      feelsLike: item.feelsLike as number,
      humidity: item.humidity as number,
      ...base,
    };
  }
  return {
    type: "air",
    level: item.level as "good" | "moderate" | "unhealthy" | "hazardous",
    ...base,
  };
}

export async function putReading(reading: SafetyReading): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { PK: SAFETY_PK, SK: readingSortKey(reading), entity: READING_ENTITY, ...reading },
    }),
  );
}

// One Query on the SAFETY partition loads every latest reading.
export async function listReadings(): Promise<SafetyReading[]> {
  const readings: SafetyReading[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": SAFETY_PK },
        ExclusiveStartKey: startKey,
      }),
    );
    readings.push(...(result.Items ?? []).map(toReading));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return readings;
}

const facilityKey = (id: string) => ({ PK: `FACILITY#${id}`, SK: "META" });

const toFacility = (item: Record<string, unknown>): FacilityReport => ({
  id: item.id as string,
  title: item.title as string,
  area: item.area as string,
  category: item.category as string,
  status: item.status as FacilityReport["status"],
  description: (item.description as string | undefined) ?? "",
  reportedAt: item.reportedAt as string,
  updatedAt: item.updatedAt as string,
});

export async function putFacility(report: FacilityReport, mustExist: boolean): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: {
        ...facilityKey(report.id),
        GSI1PK: "FACILITY",
        GSI1SK: report.updatedAt,
        entity: FACILITY_ENTITY,
        ...report,
      },
      ConditionExpression: mustExist ? "attribute_exists(PK)" : "attribute_not_exists(PK)",
    }),
  );
}

export async function getFacility(id: string): Promise<FacilityReport | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: facilityKey(id) }));
  return result.Item ? toFacility(result.Item) : undefined;
}

export async function listFacilities(limit: number): Promise<FacilityReport[]> {
  const result = await db().send(
    new QueryCommand({
      TableName: table(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": "FACILITY" },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (result.Items ?? []).map(toFacility);
}
