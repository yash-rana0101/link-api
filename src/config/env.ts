import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 4000);
const rustServiceUrlRaw = process.env.RUST_SERVICE_URL ?? "http://localhost:5000";

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
  jwtSecret,
  accessTokenTtl,
  refreshTokenTtl,
  rustServiceUrl,
};
