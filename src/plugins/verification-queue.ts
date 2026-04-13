import { Queue, Worker } from "bullmq";
import { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import Redis from "ioredis";

import { env } from "../config/env";
import { VERIFICATION_QUEUE_NAME, VerificationQueueJobData } from "../modules/verification/verification.queue";

const verificationQueuePlugin: FastifyPluginAsync = fp(async (app) => {
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
    app.log.error({ err: error }, "Verification queue Redis connection error");
  });

  workerConnection.on("error", (error) => {
    app.log.error({ err: error }, "Verification worker Redis connection error");
  });

  await Promise.all([queueConnection.connect(), workerConnection.connect()]);

  const verificationQueue = new Queue<VerificationQueueJobData>(VERIFICATION_QUEUE_NAME, {
    connection: queueConnection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  const verificationWorker = new Worker<VerificationQueueJobData>(
    VERIFICATION_QUEUE_NAME,
    async (job) => {
      app.log.info(
        {
          jobId: job.id,
          experienceId: job.data.experienceId,
          requesterId: job.data.requesterId,
          verifierId: job.data.verifierId,
        },
        "Processed verification request job.",
      );
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

  app.decorate("verificationQueue", verificationQueue);

  app.addHook("onClose", async () => {
    await verificationWorker.close();
    await verificationQueue.close();
    await queueConnection.quit();
    await workerConnection.quit();
  });
});

export default verificationQueuePlugin;
