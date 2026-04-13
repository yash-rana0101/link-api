import { Job } from "bullmq";
import { FastifyInstance } from "fastify";

import { FeedQueueJobData } from "../modules/post/feed.queue";
import { CacheService } from "../services/cache.service";

export const processFeedJob = async (
  app: FastifyInstance,
  job: Job<FeedQueueJobData>,
): Promise<void> => {
  const cacheService = new CacheService(app.redis, app.log);

  if (job.data.action === "invalidate_all_feed") {
    await cacheService.delByPattern("feed:*");

    app.log.info(
      {
        jobId: job.id,
        source: job.data.source,
      },
      "Invalidated all feed cache entries.",
    );

    return;
  }

  const userId = job.data.userId?.trim();

  if (!userId) {
    app.log.warn(
      {
        jobId: job.id,
        source: job.data.source,
      },
      "Skipped feed invalidation job because userId is missing.",
    );

    return;
  }

  await cacheService.delByPattern(`feed:${userId}:*`);

  app.log.info(
    {
      jobId: job.id,
      userId,
      source: job.data.source,
    },
    "Invalidated user feed cache entries.",
  );
};
