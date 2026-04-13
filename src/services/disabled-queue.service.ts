import { Queue } from "bullmq";
import { FastifyBaseLogger } from "fastify";

export const createDisabledQueue = <T extends object>(
  queueName: string,
  logger: FastifyBaseLogger,
): Queue<T> => ({
  name: queueName,
  add: async (jobName: string) => {
    logger.warn(
      {
        queueName,
        jobName,
      },
      "Queue is disabled because Redis is unavailable.",
    );

    return { id: "disabled" } as never;
  },
  close: async () => {
    return;
  },
}) as unknown as Queue<T>;
