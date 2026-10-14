import type { CreateTableCommandInput } from "@aws-sdk/client-dynamodb";

// Mirrors infra/terraform/modules/data; change both together.
export const GSI_NAMES = ["GSI1", "GSI2", "GSI3"] as const;
export type GsiName = (typeof GSI_NAMES)[number];

export function tableDefinition(tableName: string): CreateTableCommandInput {
  return {
    TableName: tableName,
    BillingMode: "PAY_PER_REQUEST",
    KeySchema: [
      { AttributeName: "PK", KeyType: "HASH" },
      { AttributeName: "SK", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "PK", AttributeType: "S" },
      { AttributeName: "SK", AttributeType: "S" },
      ...GSI_NAMES.flatMap((gsi) => [
        { AttributeName: `${gsi}PK`, AttributeType: "S" as const },
        { AttributeName: `${gsi}SK`, AttributeType: "S" as const },
      ]),
    ],
    GlobalSecondaryIndexes: GSI_NAMES.map((gsi) => ({
      IndexName: gsi,
      KeySchema: [
        { AttributeName: `${gsi}PK`, KeyType: "HASH" as const },
        { AttributeName: `${gsi}SK`, KeyType: "RANGE" as const },
      ],
      Projection: { ProjectionType: "ALL" as const },
    })),
  };
}
