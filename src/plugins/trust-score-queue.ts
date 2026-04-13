import { Queue, Worker } from "bullmq";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { TRUST_SCORE_QUEUE_NAME, TrustScoreQueueJobData } from "../modules/trust/trust.queue";
import { TrustRepository } from "../modules/trust/trust.repository";
import { TrustService } from "../modules/trust/trust.service";
import { createDisabledQueue } from "../services/disabled-queue.service";
import { connectRedisWithRetry, getRedisErrorMessage } from "../utils/redis-startup";
import { processTrustScoreJob } from "../workers/trust.worker";

const trustScoreQueuePlugin: FastifyPluginAsync = fp(async (app) => {
  let queueConnection: Redis | null = null;
  let workerConnection: Redis | null = null;
  let trustScoreWorker: Worker<TrustScoreQueueJobData> | null = null;
  let isQueueConnectionReady = false;
  let isWorkerConnectionReady = false;
  let trustScoreQueue: Queue<TrustScoreQueueJobData> = createDisabledQueue(TRUST_SCORE_QUEUE_NAME, app.log);

  const trustRepository = new TrustRepository(app);
  const trustService = new TrustService(trustRepository, app.rustEngine, app.log);

  try {
    queueConnection = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });

    workerConnection = new Redis(env.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
      retryStrategy: () => null,
    });

    queueConnection.on("error", (error) => {
      if (!isQueueConnectionReady) {
        app.log.debug({ reason: getRedisErrorMessage(error) }, "Trust score queue Redis is unavailable during startup.");
        return;
      }

      app.log.error({ err: error }, "Trust score queue Redis connection error");
    });

    workerConnection.on("error", (error) => {
      if (!isWorkerConnectionReady) {
        app.log.debug({ reason: getRedisErrorMessage(error) }, "Trust score worker Redis is unavailable during startup.");
        return;
      }

      app.log.error({ err: error }, "Trust score worker Redis connection error");
    });

    await Promise.all([
      connectRedisWithRetry(queueConnection, {
        logger: app.log,
        label: "Trust score queue Redis",
        retries: env.redisConnectRetries,
        delayMs: env.redisConnectDelayMs,
      }),
      connectRedisWithRetry(workerConnection, {
        logger: app.log,
        label: "Trust score worker Redis",
        retries: env.redisConnectRetries,
        delayMs: env.redisConnectDelayMs,
      }),
    ]);

    isQueueConnectionReady = true;
    isWorkerConnectionReady = true;

    trustScoreQueue = new Queue<TrustScoreQueueJobData>(TRUST_SCORE_QUEUE_NAME, {
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

    trustScoreWorker = new Worker<TrustScoreQueueJobData>(
      TRUST_SCORE_QUEUE_NAME,
      async (job) => {
        await processTrustScoreJob(app, trustService, job);
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
  } catch (error) {
    if (env.redisRequired) {
      throw new Error(`Trust queue requires Redis: ${getRedisErrorMessage(error)}`);
    }

    app.log.warn(
      {
        reason: getRedisErrorMessage(error),
      },
      "Trust queue is disabled because Redis is unavailable.",
    );
  }

  app.decorate("trustScoreQueue", trustScoreQueue);

  app.addHook("onClose", async () => {
    if (trustScoreWorker) {
      await trustScoreWorker.close();
    }

    await trustScoreQueue.close();

    if (queueConnection) {
      await queueConnection.quit().catch(() => undefined);
    }

    if (workerConnection) {
      await workerConnection.quit().catch(() => undefined);
    }
  });
});

export default trustScoreQueuePlugin;