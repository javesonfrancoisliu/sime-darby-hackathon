export interface Config {
  serviceName: string;
  tableName: string | undefined;
}

const DEFAULT_SERVICE_NAME = "sdh-api";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    serviceName: env.SERVICE_NAME || DEFAULT_SERVICE_NAME,
    tableName: env.TABLE_NAME || undefined,
  };
}

export const config = loadConfig();
