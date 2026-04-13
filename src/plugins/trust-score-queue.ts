import { Queue, Worker } from "bullmq";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { TRUST_SCORE_QUEUE_NAME, TrustScoreQueueJobData } from "../modules/trust/trust.queue";
import { TrustRepository } from "../modules/trust/trust.repository";
import { TrustService } from "../modules/trust/trust.service";

const trustScoreQueuePlugin: FastifyPluginAsync = fp(async (app) => {
  const queueConnection = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

  const workerConnection = new Redis(env.redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    retryStrategy: () => null,
  });

  queueConnection.on("error", (error) => {
    app.log.error({ err: error }, "Trust score queue Redis connection error");
  });

  workerConnection.on("error", (error) => {
    app.log.error({ err: error }, "Trust score worker Redis connection error");
  });

  await Promise.all([queueConnection.connect(), workerConnection.connect()]);

  const trustScoreQueue = new Queue<TrustScoreQueueJobData>(TRUST_SCORE_QUEUE_NAME, {
    connection: queueConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });

  const trustRepository = new TrustRepository(app);
  const trustService = new TrustService(trustRepository, app.rustEngine, app.log);

  const trustScoreWorker = new Worker<TrustScoreQueueJobData>(
    TRUST_SCORE_QUEUE_NAME,
    async (job) => {
      const result = await trustService.recalculateTrustScore(job.data);

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
    },
    {
      connection: workerConnection,
    },
  );

  trustScoreWorker.on("failed", (job, error) => {
    app.log.error(
      {
        err: error,
        jobId: job?.id,
        userId: job?.data.userId,
        event: job?.data.event,
      },
      "Trust score queue job failed.",
    );
  });

  await trustScoreWorker.waitUntilReady();

  app.decorate("trustScoreQueue", trustScoreQueue);

  app.addHook("onClose", async () => {
    await trustScoreWorker.close();
    await trustScoreQueue.close();
    await queueConnection.quit();
    await workerConnection.quit();
  });
});

export default trustScoreQueuePlugin;