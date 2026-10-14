import type { ErrorCode, ErrorResponse } from "@sdh/contracts";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  body: unknown;
}

export interface HttpResponse {
  status: number;
  body: unknown;
}

export type Handler = (req: HttpRequest) => HttpResponse | Promise<HttpResponse>;

export interface Route {
  method: HttpMethod;
  path: string;
  handler: Handler;
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

export class HttpError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "HttpError";
    this.code = code;
  }

  get status(): number {
    return STATUS_BY_CODE[this.code];
  }
}

export function ok<T>(body: T, status = 200): HttpResponse {
  return { status, body };
}

export function errorResponse(code: ErrorCode, message: string): HttpResponse {
  const body: ErrorResponse = { error: { code, message } };
  return { status: STATUS_BY_CODE[code], body };
}
