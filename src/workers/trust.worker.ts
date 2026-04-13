import { Job } from "bullmq";
import { FastifyInstance } from "fastify";

import { TrustService } from "../modules/trust/trust.service";
import { TrustScoreQueueJobData } from "../modules/trust/trust.queue";
import { CacheService } from "../services/cache.service";

export const processTrustScoreJob = async (
  app: FastifyInstance,
  trustService: TrustService,
  job: Job<TrustScoreQueueJobData>,
): Promise<void> => {
  const result = await trustService.recalculateTrustScore(job.data);
  const cacheService = new CacheService(app.redis, app.log);

  await cacheService.del(`profile:${job.data.userId}`);

  app.log.info(
    {
      jobId: job.id,
      userId: job.data.userId,
      event: job.data.event,
      trustScore: result.trustScore,
      trustLevel: result.trustLevel,
    },
    "Processed trust score recalculation job.",
  );
};
