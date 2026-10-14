// Lambda's JSON log format wraps console output with timestamp, level and requestId.
type Fields = Record<string, unknown>;
type Level = "info" | "warn" | "error";

const write = (level: Level) => (message: string, fields?: Fields) =>
  fields ? console[level](message, fields) : console[level](message);

export const logger = {
  info: write("info"),
  warn: write("warn"),
  error: write("error"),
};
