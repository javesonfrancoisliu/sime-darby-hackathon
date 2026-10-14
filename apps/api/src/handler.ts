import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { dispatch } from "./router";

const RESPONSE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  const rawBody =
    event.body !== undefined && event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

  const response = await dispatch({
    method: event.requestContext.http.method,
    path: event.rawPath,
    query: event.queryStringParameters ?? {},
    headers: event.headers ?? {},
    rawBody,
  });

  return {
    statusCode: response.status,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify(response.body),
  };
}
