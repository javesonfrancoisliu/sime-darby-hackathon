import { z } from "zod";

export const ErrorCode = z.enum([
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "CONFLICT_RETRY",
  "INSUFFICIENT_POINTS",
  "ALREADY_DONE",
  "PROFILE_REQUIRED",
  "INTERNAL",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ErrorResponse = z.object({
  error: z.object({
    code: ErrorCode,
    message: z.string(),
  }),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
