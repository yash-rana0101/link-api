import { FastifyInstance, preHandlerHookHandler } from "fastify";

interface RateLimitOptions {
  endpoint: string;
  maxRequests: number;
  windowSeconds?: number;
}

const DEFAULT_WINDOW_SECONDS = 60;

export const createRateLimitPreHandler = (
  app: FastifyInstance,
  options: RateLimitOptions,
): preHandlerHookHandler => {
  const endpoint = options.endpoint.trim();
  const maxRequests = Math.max(1, Math.floor(options.maxRequests));
  const windowSeconds = Math.max(1, Math.floor(options.windowSeconds ?? DEFAULT_WINDOW_SECONDS));

  return async (request, reply): Promise<void> => {
    const requestUser = request.user as { sub?: string } | undefined;
    const subject = requestUser?.sub?.trim() || request.ip;
    const key = `rate:${subject}:${endpoint}`;

    try {
      const count = await app.redis.incr(key);

      if (count === 1) {
        await app.redis.expire(key, windowSeconds);
      }

      if (count > maxRequests) {
        reply.status(429).send({
          success: false,
          message: `Rate limit exceeded for ${endpoint}. Try again in ${windowSeconds} seconds.`,
        });

        return;
      }
    } catch (error) {
      app.log.warn(
        {
          err: error,
          endpoint,
          key,
        },
        "Rate limiting is unavailable. Continuing request.",
      );
    }
  };
};
