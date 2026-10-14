import type { z } from "zod";
import { HttpError } from "./http";

// Parses untrusted input; the error names the field and rule but never echoes the value.
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const where = issue && issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  throw new HttpError("VALIDATION_FAILED", `${where}${issue?.message ?? "Invalid input"}`);
}
