import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 4000);
const nodeEnv = parseNodeEnv(process.env.NODE_ENV);
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
const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);

const normalizeUrl = (value: string, envKey: string, stripTrailingSlash = true): string => {
  try {
    const normalizedUrl = new URL(value).toString();
    return stripTrailingSlash ? normalizedUrl.replace(/\/$/, "") : normalizedUrl;
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
const googleOAuthClientId = parseOptionalStringEnv(process.env.GOOGLE_OAUTH_CLIENT_ID);
const googleOAuthClientSecret = parseOptionalStringEnv(process.env.GOOGLE_OAUTH_CLIENT_SECRET);
const googleOAuthRedirectUri = parseOptionalUrlEnv(process.env.GOOGLE_OAUTH_REDIRECT_URI, "GOOGLE_OAUTH_REDIRECT_URI");
const microsoftOAuthClientId = parseOptionalStringEnv(process.env.MICROSOFT_OAUTH_CLIENT_ID);
const microsoftOAuthClientSecret = parseOptionalStringEnv(process.env.MICROSOFT_OAUTH_CLIENT_SECRET);
const microsoftOAuthRedirectUri = parseOptionalUrlEnv(
  process.env.MICROSOFT_OAUTH_REDIRECT_URI,
  "MICROSOFT_OAUTH_REDIRECT_URI",
);
const microsoftOAuthTenantId = parseMicrosoftTenantId(process.env.MICROSOFT_OAUTH_TENANT_ID);

assertPairedOptionalEnv(
  "GOOGLE_OAUTH_CLIENT_ID",
  googleOAuthClientId,
  "GOOGLE_OAUTH_CLIENT_SECRET",
  googleOAuthClientSecret,
);
assertPairedOptionalEnv(
  "MICROSOFT_OAUTH_CLIENT_ID",
  microsoftOAuthClientId,
  "MICROSOFT_OAUTH_CLIENT_SECRET",
  microsoftOAuthClientSecret,
);

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
  nodeEnv,
  databaseUrl,
  redisUrl,
  redisRequired,
  redisConnectRetries,
  redisConnectDelayMs,
  jwtSecret,
  accessTokenTtl,
  refreshTokenTtl,
  rustServiceUrl,
  corsOrigins,
  googleOAuthClientId,
  googleOAuthClientSecret,
  googleOAuthRedirectUri,
  microsoftOAuthClientId,
  microsoftOAuthClientSecret,
  microsoftOAuthRedirectUri,
  microsoftOAuthTenantId,
};

function parseNodeEnv(value: string | undefined): "development" | "test" | "production" {
  if (!value) {
    return "development";
  }

  if (value === "development" || value === "test" || value === "production") {
    return value;
  }

  throw new Error("NODE_ENV must be one of: development, test, production.");
}

function parseCorsOrigins(value: string | undefined): string[] {
  const defaultOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

  if (typeof value === "undefined") {
    return defaultOrigins;
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGINS must contain at least one origin when provided.");
  }

  if (origins.includes("*")) {
    return ["*"];
  }

  const normalizedOrigins = origins.map((origin) => normalizeUrl(origin, "CORS_ORIGINS"));

  return [...new Set(normalizedOrigins)];
}

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

function parseOptionalStringEnv(value: string | undefined): string | null {
  if (typeof value === "undefined") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function parseOptionalUrlEnv(value: string | undefined, key: string): string | null {
  const normalized = parseOptionalStringEnv(value);

  if (!normalized) {
    return null;
  }

  return normalizeUrl(normalized, key, false);
}

function parseMicrosoftTenantId(value: string | undefined): string {
  const normalized = parseOptionalStringEnv(value);

  if (!normalized) {
    return "common";
  }

  if (normalized.includes("/") || normalized.includes("?") || normalized.includes("#")) {
    throw new Error("MICROSOFT_OAUTH_TENANT_ID must be a valid tenant identifier.");
  }

  return normalized;
}

function assertPairedOptionalEnv(
  firstKey: string,
  firstValue: string | null,
  secondKey: string,
  secondValue: string | null,
): void {
  if ((firstValue && !secondValue) || (!firstValue && secondValue)) {
    throw new Error(`${firstKey} and ${secondKey} must both be set together.`);
  }
}
