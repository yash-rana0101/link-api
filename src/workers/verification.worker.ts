import { Job } from "bullmq";
import { NotificationType } from "@prisma/client";
import { FastifyInstance } from "fastify";

import { VerificationQueueJobData } from "../modules/verification/verification.queue";

export const processVerificationJob = async (
  app: FastifyInstance,
  job: Job<VerificationQueueJobData>,
): Promise<void> => {
  app.log.info(
    {
      jobId: job.id,
      experienceId: job.data.experienceId,
      requesterId: job.data.requesterId,
      verifierId: job.data.verifierId,
    },
    "Processed verification request job.",
  );

  try {
    await app.notificationQueue.add("notify-verification-request", {
      userId: job.data.verifierId,
      type: NotificationType.VERIFICATION_REQUEST,
      message: "You received a verification request.",
    });
  } catch (error) {
    app.log.error(
      {
        err: error,
        jobId: job.id,
        verifierId: job.data.verifierId,
      },
      "Failed to enqueue verification notification.",
    );
  }
};
