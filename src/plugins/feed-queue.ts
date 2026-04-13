import { Queue, Worker } from "bullmq";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { FEED_QUEUE_NAME, FeedQueueJobData } from "../modules/post/feed.queue";
import { createDisabledQueue } from "../services/disabled-queue.service";
import { connectRedisWithRetry, getRedisErrorMessage } from "../utils/redis-startup";
import { processFeedJob } from "../workers/feed.worker";

const feedQueuePlugin: FastifyPluginAsync = fp(async (app) => {
  let queueConnection: Redis | null = null;
  let workerConnection: Redis | null = null;
  let feedWorker: Worker<FeedQueueJobData> | null = null;
  let isQueueConnectionReady = false;
  let isWorkerConnectionReady = false;
  let feedQueue: Queue<FeedQueueJobData> = createDisabledQueue(FEED_QUEUE_NAME, app.log);

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
        app.log.debug({ reason: getRedisErrorMessage(error) }, "Feed queue Redis is unavailable during startup.");
        return;
      }

      app.log.error({ err: error }, "Feed queue Redis connection error");
    });

    workerConnection.on("error", (error) => {
      if (!isWorkerConnectionReady) {
        app.log.debug({ reason: getRedisErrorMessage(error) }, "Feed worker Redis is unavailable during startup.");
        return;
      }

      app.log.error({ err: error }, "Feed worker Redis connection error");
    });

    await Promise.all([
      connectRedisWithRetry(queueConnection, {
        logger: app.log,
        label: "Feed queue Redis",
        retries: env.redisConnectRetries,
        delayMs: env.redisConnectDelayMs,
      }),
      connectRedisWithRetry(workerConnection, {
        logger: app.log,
        label: "Feed worker Redis",
        retries: env.redisConnectRetries,
        delayMs: env.redisConnectDelayMs,
      }),
    ]);

    isQueueConnectionReady = true;
    isWorkerConnectionReady = true;

    feedQueue = new Queue<FeedQueueJobData>(FEED_QUEUE_NAME, {
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

    feedWorker = new Worker<FeedQueueJobData>(
      FEED_QUEUE_NAME,
      async (job) => {
        await processFeedJob(app, job);
      },
      {
        connection: workerConnection,
      },
    );

    feedWorker.on("failed", (job, error) => {
      app.log.error(
        {
          err: error,
          jobId: job?.id,
          action: job?.data.action,
          userId: job?.data.userId,
        },
        "Feed queue job failed.",
      );
    });

    await feedWorker.waitUntilReady();
  } catch (error) {
    if (env.redisRequired) {
      throw new Error(`Feed queue requires Redis: ${getRedisErrorMessage(error)}`);
    }

    app.log.warn(
      {
        reason: getRedisErrorMessage(error),
      },
      "Feed queue is disabled because Redis is unavailable.",
    );
  }

  app.decorate("feedQueue", feedQueue);

  app.addHook("onClose", async () => {
    if (feedWorker) {
      await feedWorker.close();
    }

    await feedQueue.close();

    if (queueConnection) {
      await queueConnection.quit().catch(() => undefined);
    }

    if (workerConnection) {
      await workerConnection.quit().catch(() => undefined);
    }
  });
});

export default feedQueuePlugin;
