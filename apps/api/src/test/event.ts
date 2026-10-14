import type { APIGatewayProxyEventV2 } from "aws-lambda";

interface EventInput {
  method?: string;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
}

export function apiEvent({
  method = "GET",
  path,
  query,
  headers,
  body,
}: EventInput): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "ANY /api/{proxy+}",
    rawPath: path,
    rawQueryString: new URLSearchParams(query).toString(),
    headers: { "content-type": "application/json", ...headers },
    queryStringParameters: query,
    body: body === undefined ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: {
      accountId: "000000000000",
      apiId: "test",
      domainName: "test.local",
      domainPrefix: "test",
      http: { method, path, protocol: "HTTP/1.1", sourceIp: "127.0.0.1", userAgent: "vitest" },
      requestId: "test-request",
      routeKey: "ANY /api/{proxy+}",
      stage: "$default",
      time: "14/Oct/2026:00:00:00 +0000",
      timeEpoch: 0,
    },
  };
}
