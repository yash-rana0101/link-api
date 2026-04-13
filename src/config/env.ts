import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 4000);
const rustServiceUrlRaw = process.env.RUST_SERVICE_URL ?? "http://localhost:5000";
const redisRequired = parseBooleanEnv(process.env.REDIS_REQUIRED, false, "REDIS_REQUIRED");
const redisConnectRetries = parseNonNegativeIntEnv(
  process.env.REDIS_CONNECT_RETRIES,
  8,
  "REDIS_CONNECT_RETRIES",
);
const redisConnectDelayMs = parsePositiveIntEnv(
  process.env.REDIS_CONNECT_DELAY_MS,
  1000,
  "REDIS_CONNECT_DELAY_MS",
);

const normalizeUrl = (value: string, envKey: string): string => {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${envKey} must be a valid URL.`);
  }
};

if (Number.isNaN(port)) {
  throw new Error("PORT must be a number.");
}

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const jwtSecret = process.env.JWT_SECRET;
const accessTokenTtl = process.env.JWT_ACCESS_TTL ?? "15m";
const refreshTokenTtl = process.env.JWT_REFRESH_TTL ?? "7d";
const rustServiceUrl = normalizeUrl(rustServiceUrlRaw, "RUST_SERVICE_URL");

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

if (!redisUrl) {
  throw new Error("REDIS_URL is required.");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required.");
}

export const env = {
  port,
  databaseUrl,
  redisUrl,
  redisRequired,
  redisConnectRetries,
  redisConnectDelayMs,
  jwtSecret,
  accessTokenTtl,
  refreshTokenTtl,
  rustServiceUrl,
};

function parseBooleanEnv(value: string | undefined, defaultValue: boolean, key: string): boolean {
  if (typeof value === "undefined") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${key} must be a boolean value.`);
}

function parseNonNegativeIntEnv(value: string | undefined, defaultValue: number, key: string): number {
  if (typeof value === "undefined") {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${key} must be a non-negative integer.`);
  }

  return parsed;
}

function parsePositiveIntEnv(value: string | undefined, defaultValue: number, key: string): number {
  if (typeof value === "undefined") {
    return defaultValue;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsed;
}
