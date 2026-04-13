import { Queue, Worker } from "bullmq";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { NOTIFICATION_QUEUE_NAME, NotificationQueueJobData } from "../modules/notification/notification.queue";
import { createDisabledQueue } from "../services/disabled-queue.service";
import { connectRedisWithRetry, getRedisErrorMessage } from "../utils/redis-startup";
import { processNotificationJob } from "../workers/notification.worker";

const notificationQueuePlugin: FastifyPluginAsync = fp(async (app) => {
  let queueConnection: Redis | null = null;
  let workerConnection: Redis | null = null;
  let notificationWorker: Worker<NotificationQueueJobData> | null = null;
  let isQueueConnectionReady = false;
  let isWorkerConnectionReady = false;
  let notificationQueue: Queue<NotificationQueueJobData> = createDisabledQueue(
    NOTIFICATION_QUEUE_NAME,
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
        app.log.debug({ reason: getRedisErrorMessage(error) }, "Notification queue Redis is unavailable during startup.");
        return;
      }

      app.log.error({ err: error }, "Notification queue Redis connection error");
    });

    workerConnection.on("error", (error) => {
      if (!isWorkerConnectionReady) {
        app.log.debug({ reason: getRedisErrorMessage(error) }, "Notification worker Redis is unavailable during startup.");
        return;
      }

      app.log.error({ err: error }, "Notification worker Redis connection error");
    });

    await Promise.all([
      connectRedisWithRetry(queueConnection, {
        logger: app.log,
        label: "Notification queue Redis",
        retries: env.redisConnectRetries,
        delayMs: env.redisConnectDelayMs,
      }),
      connectRedisWithRetry(workerConnection, {
        logger: app.log,
        label: "Notification worker Redis",
        retries: env.redisConnectRetries,
        delayMs: env.redisConnectDelayMs,
      }),
    ]);

    isQueueConnectionReady = true;
    isWorkerConnectionReady = true;

    notificationQueue = new Queue<NotificationQueueJobData>(NOTIFICATION_QUEUE_NAME, {
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

    notificationWorker = new Worker<NotificationQueueJobData>(
      NOTIFICATION_QUEUE_NAME,
      async (job) => {
        await processNotificationJob(app, job);
      },
      {
        connection: workerConnection,
      },
    );

    notificationWorker.on("failed", (job, error) => {
      app.log.error(
        {
          err: error,
          jobId: job?.id,
          userId: job?.data.userId,
          type: job?.data.type,
        },
        "Notification queue job failed.",
      );
    });

    await notificationWorker.waitUntilReady();
  } catch (error) {
    if (env.redisRequired) {
      throw new Error(`Notification queue requires Redis: ${getRedisErrorMessage(error)}`);
    }

    app.log.warn(
      {
        reason: getRedisErrorMessage(error),
      },
      "Notification queue is disabled because Redis is unavailable.",
    );
  }

  app.decorate("notificationQueue", notificationQueue);

  app.addHook("onClose", async () => {
    if (notificationWorker) {
      await notificationWorker.close();
    }

    await notificationQueue.close();

    if (queueConnection) {
      await queueConnection.quit().catch(() => undefined);
    }

    if (workerConnection) {
      await workerConnection.quit().catch(() => undefined);
    }
  });
});

export default notificationQueuePlugin;
