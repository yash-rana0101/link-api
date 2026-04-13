import { FastifyBaseLogger } from "fastify";
import Redis from "ioredis";

const SCAN_BATCH_SIZE = 100;

export class CacheService {
  constructor(
    private readonly redis: Redis,
    private readonly logger: FastifyBaseLogger,
  ) { }

  async get<T>(key: string): Promise<T | null> {
    try {
      const rawValue = await this.redis.get(key);

      if (!rawValue) {
        return null;
      }

      return JSON.parse(rawValue) as T;
    } catch (error) {
      this.logger.warn({ err: error, key }, "Failed to read cache key.");
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (error) {
      this.logger.warn({ err: error, key, ttlSeconds }, "Failed to write cache key.");
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn({ err: error, key }, "Failed to delete cache key.");
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    try {
      let cursor = "0";

      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, "MATCH", pattern, "COUNT", SCAN_BATCH_SIZE);
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== "0");
    } catch (error) {
      this.logger.warn({ err: error, pattern }, "Failed to delete cache keys by pattern.");
    }
  }
}
