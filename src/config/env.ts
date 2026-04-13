import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 4000);

if (Number.isNaN(port)) {
  throw new Error("PORT must be a number.");
}

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const jwtSecret = process.env.JWT_SECRET;

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
};
