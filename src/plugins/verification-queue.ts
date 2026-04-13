import { Queue, Worker } from "bullmq";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { VERIFICATION_QUEUE_NAME, VerificationQueueJobData } from "../modules/verification/verification.queue";
import { createDisabledQueue } from "../services/disabled-queue.service";
import { connectRedisWithRetry, getRedisErrorMessage } from "../utils/redis-startup";
import { processVerificationJob } from "../workers/verification.worker";

const verificationQueuePlugin: FastifyPluginAsync = fp(async (app) => {
  let queueConnection: Redis | null = null;
  let workerConnection: Redis | null = null;
  let verificationWorker: Worker<VerificationQueueJobData> | null = null;
  let isQueueConnectionReady = false;
  let isWorkerConnectionReady = false;
  let verificationQueue: Queue<VerificationQueueJobData> = createDisabledQueue(
    VERIFICATION_QUEUE_NAME,
    app.log,
  );

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
        app.log.debug({ reason: getRedisErrorMessage(error) }, "Verification queue Redis is unavailable during startup.");
        return;
      }

      app.log.error({ err: error }, "Verification queue Redis connection error");
    });

    workerConnection.on("error", (error) => {
      if (!isWorkerConnectionReady) {
        app.log.debug({ reason: getRedisErrorMessage(error) }, "Verification worker Redis is unavailable during startup.");
        return;
      }

      app.log.error({ err: error }, "Verification worker Redis connection error");
    });

    await Promise.all([
      connectRedisWithRetry(queueConnection, {
        logger: app.log,
        label: "Verification queue Redis",
        retries: env.redisConnectRetries,
        delayMs: env.redisConnectDelayMs,
      }),
      connectRedisWithRetry(workerConnection, {
        logger: app.log,
        label: "Verification worker Redis",
        retries: env.redisConnectRetries,
        delayMs: env.redisConnectDelayMs,
      }),
    ]);

    isQueueConnectionReady = true;
    isWorkerConnectionReady = true;

    verificationQueue = new Queue<VerificationQueueJobData>(VERIFICATION_QUEUE_NAME, {
      connection: queueConnection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    verificationWorker = new Worker<VerificationQueueJobData>(
      VERIFICATION_QUEUE_NAME,
      async (job) => {
        await processVerificationJob(app, job);
      },
      {
        connection: workerConnection,
      },
    );

    verificationWorker.on("failed", (job, error) => {
      app.log.error(
        {
          err: error,
          jobId: job?.id,
          experienceId: job?.data.experienceId,
        },
        "Verification queue job failed.",
      );
    });

    await verificationWorker.waitUntilReady();
  } catch (error) {
    if (env.redisRequired) {
      throw new Error(`Verification queue requires Redis: ${getRedisErrorMessage(error)}`);
    }

    app.log.warn(
      {
        reason: getRedisErrorMessage(error),
      },
      "Verification queue is disabled because Redis is unavailable.",
    );
  }

  app.decorate("verificationQueue", verificationQueue);

  app.addHook("onClose", async () => {
    if (verificationWorker) {
      await verificationWorker.close();
    }

    await verificationQueue.close();

    if (queueConnection) {
      await queueConnection.quit().catch(() => undefined);
    }

    if (workerConnection) {
      await workerConnection.quit().catch(() => undefined);
    }
  });
});

export default verificationQueuePlugin;
