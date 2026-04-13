import { Queue, Worker } from "bullmq";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { FEED_QUEUE_NAME, FeedQueueJobData } from "../modules/post/feed.queue";
import { createDisabledQueue } from "../services/disabled-queue.service";
import { processFeedJob } from "../workers/feed.worker";

const feedQueuePlugin: FastifyPluginAsync = fp(async (app) => {
  let queueConnection: Redis | null = null;
  let workerConnection: Redis | null = null;
  let feedWorker: Worker<FeedQueueJobData> | null = null;
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
      app.log.error({ err: error }, "Feed queue Redis connection error");
    });

    workerConnection.on("error", (error) => {
      app.log.error({ err: error }, "Feed worker Redis connection error");
    });

    await Promise.all([queueConnection.connect(), workerConnection.connect()]);

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
    app.log.warn(
      {
        err: error,
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
