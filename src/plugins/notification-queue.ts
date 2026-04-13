import { Queue, Worker } from "bullmq";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { NOTIFICATION_QUEUE_NAME, NotificationQueueJobData } from "../modules/notification/notification.queue";
import { createDisabledQueue } from "../services/disabled-queue.service";
import { processNotificationJob } from "../workers/notification.worker";

const notificationQueuePlugin: FastifyPluginAsync = fp(async (app) => {
  let queueConnection: Redis | null = null;
  let workerConnection: Redis | null = null;
  let notificationWorker: Worker<NotificationQueueJobData> | null = null;
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
      app.log.error({ err: error }, "Notification queue Redis connection error");
    });

    workerConnection.on("error", (error) => {
      app.log.error({ err: error }, "Notification worker Redis connection error");
    });

    await Promise.all([queueConnection.connect(), workerConnection.connect()]);

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
    app.log.warn(
      {
        err: error,
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
