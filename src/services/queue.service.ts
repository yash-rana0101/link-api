import { JobsOptions, Queue } from "bullmq";
import { FastifyBaseLogger } from "fastify";

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: true,
  removeOnFail: false,
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 1000,
  },
};

export class QueueService {
  constructor(private readonly logger: FastifyBaseLogger) { }

  async addJob<T extends object>(
    queue: Queue<any, any, string>,
    name: string,
    data: T,
    options?: JobsOptions,
  ): Promise<void> {
    try {
      await queue.add(name, data, {
        ...DEFAULT_JOB_OPTIONS,
        ...options,
      });
    } catch (error) {
      this.logger.error(
        {
          err: error,
          queueName: queue.name,
          jobName: name,
        },
        "Failed to enqueue job.",
      );

      throw error;
    }
  }
}
